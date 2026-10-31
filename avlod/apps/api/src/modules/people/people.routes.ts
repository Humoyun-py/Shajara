import { Router } from 'express';
import { z } from 'zod';
import {
  parentLinkCreateSchema,
  parentLinkUpdateSchema,
  peopleQuerySchema,
  personUpdateSchema,
  personWithRelationSchema,
  searchQuerySchema,
  treeQuerySchema,
  unionCreateSchema,
  unionUpdateSchema,
  type PersonProfileDTO,
  type SearchResultDTO,
} from '@avlod/shared';
import type { Prisma } from '@prisma/client';
import { lockFamilyTree, prisma } from '../../lib/prisma';
import { body, ok, pageMeta, param, query } from '../../lib/http';
import { badRequest, notFound } from '../../lib/errors';
import { audit } from '../../lib/audit';
import { mediaDto, parentLinkDto, personDetail, personSummary, unionDto } from '../../lib/mappers';
import { currentFamily, currentUser, familyAccess } from '../../middleware/family';
import {
  buildTree,
  createParentLink,
  createPerson,
  createUnion,
  deletePerson,
  familyStats,
  generationOf,
  personData,
  personSearchWhere,
  relativesOf,
  requirePerson,
} from './people.service';

/** Mounted at /families/:familyId (behind requireAuth). */
export const peopleRouter = Router({ mergeParams: true });

const viewerOf = (req: Parameters<typeof currentFamily>[0]) => ({ role: currentFamily(req).role });

// ─── People ──────────────────────────────────────────────────────────────────

peopleRouter.get('/people', familyAccess('VIEWER'), async (req, res) => {
  const q = query(req, peopleQuerySchema);
  const familyId = currentFamily(req).id;
  const where: Prisma.PersonWhereInput = {
    ...(q.q ? personSearchWhere(familyId, q.q) : { familyId, deletedAt: null }),
    ...(q.branch ? { branchLabel: q.branch } : {}),
  };
  const orderBy: Prisma.PersonOrderByWithRelationInput[] =
    q.sort === 'birth'
      ? [{ birthYear: { sort: 'asc', nulls: 'last' } }, { givenName: 'asc' }]
      : q.sort === 'recent'
        ? [{ createdAt: 'desc' }]
        : [{ familyName: { sort: 'asc', nulls: 'last' } }, { givenName: 'asc' }];
  const [total, rows] = await Promise.all([
    prisma.person.count({ where }),
    prisma.person.findMany({
      where,
      orderBy,
      skip: (q.page - 1) * q.pageSize,
      take: q.pageSize,
      include: { portrait: true },
    }),
  ]);
  const viewer = viewerOf(req);
  ok(
    res,
    await Promise.all(rows.map((p) => personSummary(p, viewer))),
    200,
    pageMeta(q.page, q.pageSize, total),
  );
});

peopleRouter.get('/branches', familyAccess('VIEWER'), async (req, res) => {
  const rows = await prisma.person.groupBy({
    by: ['branchLabel'],
    where: { familyId: currentFamily(req).id, deletedAt: null, branchLabel: { not: null } },
    _count: { _all: true },
    orderBy: { branchLabel: 'asc' },
  });
  ok(
    res,
    rows.map((r) => ({ label: r.branchLabel, count: r._count._all })),
  );
});

peopleRouter.post('/people', familyAccess('EDITOR'), async (req, res) => {
  const { person, relation } = body(req, personWithRelationSchema);
  const created = await createPerson(currentFamily(req).id, currentUser(req).id, person, relation);
  const full = await prisma.person.findUniqueOrThrow({
    where: { id: created.id },
    include: { portrait: true },
  });
  ok(res, await personDetail(full, viewerOf(req)), 201);
});

peopleRouter.get('/people/:personId', familyAccess('VIEWER'), async (req, res) => {
  const familyId = currentFamily(req).id;
  const personId = param(req, 'personId');
  const person = await prisma.person.findFirst({
    where: { id: personId, familyId, deletedAt: null },
    include: { portrait: true },
  });
  if (!person) throw notFound('Shaxs');
  const viewer = viewerOf(req);
  const [relatives, generation, photos] = await Promise.all([
    relativesOf(familyId, personId, viewer),
    generationOf(familyId, personId),
    prisma.personPhoto.findMany({
      where: { familyId, personId },
      include: { media: true },
      orderBy: { createdAt: 'desc' },
      take: 60,
    }),
  ]);
  const data: PersonProfileDTO = {
    person: await personDetail(person, viewer),
    relatives,
    generation,
    photos: await Promise.all(
      photos.map(async (ph) => ({
        id: ph.id,
        caption: ph.caption,
        media: (await mediaDto(ph.media))!,
      })),
    ),
  };
  ok(res, data);
});

peopleRouter.patch('/people/:personId', familyAccess('EDITOR'), async (req, res) => {
  const input = body(req, personUpdateSchema);
  const familyId = currentFamily(req).id;
  const personId = param(req, 'personId');
  const updated = await prisma.$transaction(async (tx) => {
    const before = await requirePerson(tx, familyId, personId);
    const data = personData(input);
    // A living flag and a death date contradict each other, including across partial updates.
    const living = input.isLiving !== undefined ? input.isLiving : before.isLiving;
    const deathYear = input.death !== undefined ? input.death.year : before.deathYear;
    if (living === true && deathYear !== null)
      throw badRequest('Tirik deb belgilangan shaxsda vafot sanasi bo‘lmasligi kerak.');
    const p = await tx.person.update({
      where: { id: personId },
      data,
      include: { portrait: true },
    });
    await audit(tx, {
      familyId,
      actorId: currentUser(req).id,
      action: 'person.update',
      entityType: 'Person',
      entityId: personId,
      before,
      after: input,
    });
    return p;
  });
  ok(res, await personDetail(updated, viewerOf(req)));
});

peopleRouter.delete('/people/:personId', familyAccess('ADMIN'), async (req, res) => {
  const { detach } = query(req, z.object({ detach: z.enum(['true', 'false']).default('false') }));
  await deletePerson(
    currentFamily(req).id,
    currentUser(req).id,
    param(req, 'personId'),
    detach === 'true',
  );
  res.status(204).end();
});

// ─── Parent / child relationships ────────────────────────────────────────────

peopleRouter.post('/relationships/parents', familyAccess('EDITOR'), async (req, res) => {
  const input = body(req, parentLinkCreateSchema);
  const familyId = currentFamily(req).id;
  const link = await prisma.$transaction(async (tx) => {
    await lockFamilyTree(tx, familyId);
    return createParentLink(tx, familyId, currentUser(req).id, input);
  });
  ok(res, parentLinkDto(link), 201);
});

peopleRouter.patch('/relationships/parents/:linkId', familyAccess('EDITOR'), async (req, res) => {
  const input = body(req, parentLinkUpdateSchema);
  const familyId = currentFamily(req).id;
  const link = await prisma.$transaction(async (tx) => {
    await lockFamilyTree(tx, familyId);
    const before = await tx.parentChildRelationship.findFirst({
      where: { id: param(req, 'linkId'), familyId },
    });
    if (!before) throw notFound("Bog'lanish");
    if (input.type === 'BIOLOGICAL' && before.type !== 'BIOLOGICAL') {
      const bio = await tx.parentChildRelationship.count({
        where: { childId: before.childId, type: 'BIOLOGICAL' },
      });
      if (bio >= 2)
        throw badRequest(
          'Bir shaxsda ikkitadan ortiq biologik ota-ona bo‘lishi mumkin emas.',
          undefined,
          'TOO_MANY_BIOLOGICAL_PARENTS',
        );
    }
    const l = await tx.parentChildRelationship.update({ where: { id: before.id }, data: input });
    await audit(tx, {
      familyId,
      actorId: currentUser(req).id,
      action: 'relationship.parent.update',
      entityType: 'ParentChildRelationship',
      entityId: l.id,
      before,
      after: input,
    });
    return l;
  });
  ok(res, parentLinkDto(link));
});

peopleRouter.delete('/relationships/parents/:linkId', familyAccess('EDITOR'), async (req, res) => {
  const familyId = currentFamily(req).id;
  await prisma.$transaction(async (tx) => {
    const link = await tx.parentChildRelationship.findFirst({
      where: { id: param(req, 'linkId'), familyId },
    });
    if (!link) throw notFound("Bog'lanish");
    await tx.parentChildRelationship.delete({ where: { id: link.id } });
    await audit(tx, {
      familyId,
      actorId: currentUser(req).id,
      action: 'relationship.parent.delete',
      entityType: 'ParentChildRelationship',
      entityId: link.id,
      before: link,
    });
  });
  res.status(204).end();
});

// ─── Unions ──────────────────────────────────────────────────────────────────

peopleRouter.post('/relationships/unions', familyAccess('EDITOR'), async (req, res) => {
  const input = body(req, unionCreateSchema);
  const familyId = currentFamily(req).id;
  const union = await prisma.$transaction(async (tx) => {
    await lockFamilyTree(tx, familyId);
    return createUnion(tx, familyId, currentUser(req).id, input);
  });
  ok(res, unionDto(union), 201);
});

peopleRouter.patch('/relationships/unions/:unionId', familyAccess('EDITOR'), async (req, res) => {
  const input = body(req, unionUpdateSchema);
  const familyId = currentFamily(req).id;
  const union = await prisma.$transaction(async (tx) => {
    const before = await tx.union.findFirst({ where: { id: param(req, 'unionId'), familyId } });
    if (!before) throw notFound('Juftlik');
    const u = await tx.union.update({ where: { id: before.id }, data: input });
    await audit(tx, {
      familyId,
      actorId: currentUser(req).id,
      action: 'relationship.union.update',
      entityType: 'Union',
      entityId: u.id,
      before,
      after: input,
    });
    return u;
  });
  ok(res, unionDto(union));
});

peopleRouter.delete('/relationships/unions/:unionId', familyAccess('EDITOR'), async (req, res) => {
  const familyId = currentFamily(req).id;
  await prisma.$transaction(async (tx) => {
    const u = await tx.union.findFirst({ where: { id: param(req, 'unionId'), familyId } });
    if (!u) throw notFound('Juftlik');
    await tx.union.delete({ where: { id: u.id } });
    await audit(tx, {
      familyId,
      actorId: currentUser(req).id,
      action: 'relationship.union.delete',
      entityType: 'Union',
      entityId: u.id,
      before: u,
    });
  });
  res.status(204).end();
});

// ─── Tree, search, stats ─────────────────────────────────────────────────────

peopleRouter.get('/tree', familyAccess('VIEWER'), async (req, res) => {
  const q = query(req, treeQuerySchema);
  ok(res, await buildTree(currentFamily(req).id, viewerOf(req), q));
});

peopleRouter.get('/search', familyAccess('VIEWER'), async (req, res) => {
  const { q, limit } = query(req, searchQuerySchema);
  const familyId = currentFamily(req).id;
  const text = { contains: q, mode: 'insensitive' as const };
  const [people, memories, events] = await Promise.all([
    prisma.person.findMany({
      where: personSearchWhere(familyId, q),
      take: limit,
      include: { portrait: true },
      orderBy: { givenName: 'asc' },
    }),
    prisma.memory.findMany({
      where: { familyId, OR: [{ title: text }, { description: text }, { location: text }] },
      take: limit,
      select: { id: true, title: true, year: true },
    }),
    prisma.timelineEvent.findMany({
      where: { familyId, OR: [{ title: text }, { description: text }] },
      take: limit,
      select: { id: true, title: true, year: true },
    }),
  ]);
  const viewer = viewerOf(req);
  const data: SearchResultDTO = {
    people: await Promise.all(people.map((p) => personSummary(p, viewer))),
    memories,
    events,
  };
  ok(res, data);
});

peopleRouter.get('/stats', familyAccess('VIEWER'), async (req, res) => {
  ok(res, await familyStats(currentFamily(req).id));
});
