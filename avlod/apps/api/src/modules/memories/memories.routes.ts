import { Router } from 'express';
import type { Prisma } from '../../generated/prisma/client';
import {
  albumCreateSchema,
  albumUpdateSchema,
  memoriesQuerySchema,
  memoryCreateSchema,
  memoryUpdateSchema,
} from '@avlod/shared';
import { prisma } from '../../lib/prisma';
import { body, ok, pageMeta, param, query } from '../../lib/http';
import { badRequest, forbidden, notFound } from '../../lib/errors';
import { audit } from '../../lib/audit';
import { plainDate } from '../../lib/mappers';
import { currentFamily, currentUser, familyAccess } from '../../middleware/family';
import { uploadLimiter } from '../../middleware/rateLimit';
import { removeMediaIfOrphaned, storeUpload, uploadMiddleware } from '../media/upload';
import { albumDto, assertFamilyRefs, memoryDto, memoryInclude } from './memories.service';

/** Mounted at /families/:familyId (behind requireAuth). */
export const memoriesRouter = Router({ mergeParams: true });

memoriesRouter.get('/memories', familyAccess('VIEWER'), async (req, res) => {
  const q = query(req, memoriesQuerySchema);
  const familyId = currentFamily(req).id;
  const text = q.q ? { contains: q.q, mode: 'insensitive' as const } : undefined;
  const where: Prisma.MemoryWhereInput = {
    familyId,
    ...(q.year ? { year: q.year } : {}),
    ...(q.eventType ? { eventType: q.eventType } : {}),
    ...(q.albumId ? { albumId: q.albumId } : {}),
    ...(q.personId ? { people: { some: { personId: q.personId } } } : {}),
    ...(text ? { OR: [{ title: text }, { description: text }, { location: text }] } : {}),
  };
  const [total, rows] = await Promise.all([
    prisma.memory.count({ where }),
    prisma.memory.findMany({
      where,
      include: memoryInclude,
      orderBy: [{ year: { sort: 'desc', nulls: 'last' } }, { createdAt: 'desc' }],
      skip: (q.page - 1) * q.pageSize,
      take: q.pageSize,
    }),
  ]);
  ok(res, await Promise.all(rows.map(memoryDto)), 200, pageMeta(q.page, q.pageSize, total));
});

memoriesRouter.get('/memories/years', familyAccess('VIEWER'), async (req, res) => {
  const rows = await prisma.memory.groupBy({
    by: ['year'],
    where: { familyId: currentFamily(req).id, year: { not: null } },
    _count: { _all: true },
    orderBy: { year: 'desc' },
  });
  ok(
    res,
    rows.map((r) => ({ year: r.year, count: r._count._all })),
  );
});

memoriesRouter.get('/memories/:memoryId', familyAccess('VIEWER'), async (req, res) => {
  const m = await prisma.memory.findFirst({
    where: { id: param(req, 'memoryId'), familyId: currentFamily(req).id },
    include: memoryInclude,
  });
  if (!m) throw notFound('Xotira');
  ok(res, await memoryDto(m));
});

/**
 * Create a memory. Accepts JSON, or multipart/form-data with a `file` part and a `data`
 * part holding the JSON fields — so the media and metadata are stored together.
 */
memoriesRouter.post(
  '/memories',
  familyAccess('EDITOR'),
  uploadLimiter,
  uploadMiddleware,
  async (req, res) => {
    const familyId = currentFamily(req).id;
    const actor = currentUser(req);
    const raw: unknown = req.file ? safeJson(req.body?.data) : req.body;
    const input = memoryCreateSchema.safeParse(raw);
    if (!input.success)
      throw badRequest("Kiritilgan ma'lumotlar noto'g'ri.", input.error.flatten(), 'INVALID_BODY');
    const { personIds, date, ...fields } = input.data;
    await assertFamilyRefs(prisma, familyId, { personIds, albumId: fields.albumId });
    const asset = req.file ? await storeUpload(req, familyId, actor.id) : null;
    const memory = await prisma.$transaction(async (tx) => {
      const m = await tx.memory.create({
        data: {
          ...fields,
          ...plainDate(date),
          familyId,
          mediaId: asset?.id ?? null,
          createdById: actor.id,
          people: { create: [...new Set(personIds)].map((personId) => ({ personId })) },
        },
        include: memoryInclude,
      });
      await audit(tx, {
        familyId,
        actorId: actor.id,
        action: 'memory.create',
        entityType: 'Memory',
        entityId: m.id,
        after: input.data,
      });
      return m;
    });
    ok(res, await memoryDto(memory), 201);
  },
);

function safeJson(v: unknown): unknown {
  if (typeof v !== 'string') return {};
  try {
    return JSON.parse(v);
  } catch {
    throw badRequest("`data` maydoni JSON bo'lishi kerak.", undefined, 'INVALID_BODY');
  }
}

memoriesRouter.patch('/memories/:memoryId', familyAccess('EDITOR'), async (req, res) => {
  const input = body(req, memoryUpdateSchema);
  const familyId = currentFamily(req).id;
  const { personIds, date, ...fields } = input;
  const memory = await prisma.$transaction(async (tx) => {
    const before = await tx.memory.findFirst({ where: { id: param(req, 'memoryId'), familyId } });
    if (!before) throw notFound('Xotira');
    await assertFamilyRefs(tx, familyId, { personIds, albumId: fields.albumId });
    if (personIds) {
      await tx.memoryPerson.deleteMany({ where: { memoryId: before.id } });
      await tx.memoryPerson.createMany({
        data: [...new Set(personIds)].map((personId) => ({ memoryId: before.id, personId })),
      });
    }
    const m = await tx.memory.update({
      where: { id: before.id },
      data: { ...fields, ...plainDate(date) },
      include: memoryInclude,
    });
    await audit(tx, {
      familyId,
      actorId: currentUser(req).id,
      action: 'memory.update',
      entityType: 'Memory',
      entityId: m.id,
      before,
      after: input,
    });
    return m;
  });
  ok(res, await memoryDto(memory));
});

/** Editors may delete memories they created; admins may delete any. */
memoriesRouter.delete('/memories/:memoryId', familyAccess('EDITOR'), async (req, res) => {
  const family = currentFamily(req);
  const actor = currentUser(req);
  const m = await prisma.memory.findFirst({
    where: { id: param(req, 'memoryId'), familyId: family.id },
  });
  if (!m) throw notFound('Xotira');
  if (family.role === 'EDITOR' && m.createdById !== actor.id) {
    throw forbidden("Muharrir faqat o'zi qo'shgan xotiralarni o'chira oladi.");
  }
  await prisma.$transaction(async (tx) => {
    await tx.timelineEvent.updateMany({ where: { memoryId: m.id }, data: { memoryId: null } });
    await tx.memory.delete({ where: { id: m.id } });
    await audit(tx, {
      familyId: family.id,
      actorId: actor.id,
      action: 'memory.delete',
      entityType: 'Memory',
      entityId: m.id,
      before: m,
    });
  });
  await removeMediaIfOrphaned(m.mediaId);
  res.status(204).end();
});

// ─── Albums ──────────────────────────────────────────────────────────────────

memoriesRouter.get('/albums', familyAccess('VIEWER'), async (req, res) => {
  const albums = await prisma.album.findMany({
    where: { familyId: currentFamily(req).id },
    include: { _count: { select: { memories: true } } },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });
  ok(res, await Promise.all(albums.map(albumDto)));
});

memoriesRouter.post('/albums', familyAccess('EDITOR'), async (req, res) => {
  const input = body(req, albumCreateSchema);
  const familyId = currentFamily(req).id;
  const album = await prisma.$transaction(async (tx) => {
    const a = await tx.album.create({
      data: { ...input, familyId, createdById: currentUser(req).id },
      include: { _count: { select: { memories: true } } },
    });
    await audit(tx, {
      familyId,
      actorId: currentUser(req).id,
      action: 'album.create',
      entityType: 'Album',
      entityId: a.id,
      after: input,
    });
    return a;
  });
  ok(res, await albumDto(album), 201);
});

memoriesRouter.patch('/albums/:albumId', familyAccess('EDITOR'), async (req, res) => {
  const input = body(req, albumUpdateSchema);
  const familyId = currentFamily(req).id;
  const existing = await prisma.album.findFirst({ where: { id: param(req, 'albumId'), familyId } });
  if (!existing) throw notFound('Albom');
  const album = await prisma.album.update({
    where: { id: existing.id },
    data: input,
    include: { _count: { select: { memories: true } } },
  });
  ok(res, await albumDto(album));
});

/** Deleting an album keeps its memories (they become unfiled). */
memoriesRouter.delete('/albums/:albumId', familyAccess('ADMIN'), async (req, res) => {
  const familyId = currentFamily(req).id;
  const existing = await prisma.album.findFirst({ where: { id: param(req, 'albumId'), familyId } });
  if (!existing) throw notFound('Albom');
  await prisma.$transaction(async (tx) => {
    await tx.memory.updateMany({ where: { albumId: existing.id }, data: { albumId: null } });
    await tx.album.delete({ where: { id: existing.id } });
    await audit(tx, {
      familyId,
      actorId: currentUser(req).id,
      action: 'album.delete',
      entityType: 'Album',
      entityId: existing.id,
      before: existing,
    });
  });
  res.status(204).end();
});
