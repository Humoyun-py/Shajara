import { Router } from 'express';
import { z } from 'zod';
import { timelineEventCreateSchema, timelineEventUpdateSchema, uuidSchema } from '@avlod/shared';
import { prisma } from '../../lib/prisma';
import { body, ok, param, query } from '../../lib/http';
import { notFound } from '../../lib/errors';
import { audit } from '../../lib/audit';
import { plainDate } from '../../lib/mappers';
import { currentFamily, currentUser, familyAccess } from '../../middleware/family';
import { assertFamilyRefs, timelineDto, timelineInclude } from '../memories/memories.service';

/** Mounted at /families/:familyId (behind requireAuth). */
export const timelineRouter = Router({ mergeParams: true });

const listQuery = z.object({
  personId: uuidSchema.optional(),
  limit: z.coerce.number().int().min(1).max(500).default(200),
});

timelineRouter.get('/timeline', familyAccess('VIEWER'), async (req, res) => {
  const q = query(req, listQuery);
  const events = await prisma.timelineEvent.findMany({
    where: { familyId: currentFamily(req).id, ...(q.personId ? { personId: q.personId } : {}) },
    include: timelineInclude,
    orderBy: [
      { year: { sort: 'asc', nulls: 'last' } },
      { month: { sort: 'asc', nulls: 'first' } },
      { day: { sort: 'asc', nulls: 'first' } },
    ],
    take: q.limit,
  });
  ok(res, await Promise.all(events.map(timelineDto)));
});

timelineRouter.post('/timeline', familyAccess('EDITOR'), async (req, res) => {
  const input = body(req, timelineEventCreateSchema);
  const familyId = currentFamily(req).id;
  const { date, ...fields } = input;
  const event = await prisma.$transaction(async (tx) => {
    await assertFamilyRefs(tx, familyId, {
      personIds: fields.personId ? [fields.personId] : [],
      memoryId: fields.memoryId,
    });
    const e = await tx.timelineEvent.create({
      data: { ...fields, ...plainDate(date), familyId, createdById: currentUser(req).id },
      include: timelineInclude,
    });
    await audit(tx, {
      familyId,
      actorId: currentUser(req).id,
      action: 'timeline.create',
      entityType: 'TimelineEvent',
      entityId: e.id,
      after: input,
    });
    return e;
  });
  ok(res, await timelineDto(event), 201);
});

timelineRouter.patch('/timeline/:eventId', familyAccess('EDITOR'), async (req, res) => {
  const input = body(req, timelineEventUpdateSchema);
  const familyId = currentFamily(req).id;
  const { date, ...fields } = input;
  const event = await prisma.$transaction(async (tx) => {
    const before = await tx.timelineEvent.findFirst({
      where: { id: param(req, 'eventId'), familyId },
    });
    if (!before) throw notFound('Voqea');
    await assertFamilyRefs(tx, familyId, {
      personIds: fields.personId ? [fields.personId] : [],
      memoryId: fields.memoryId,
    });
    const e = await tx.timelineEvent.update({
      where: { id: before.id },
      data: { ...fields, ...plainDate(date) },
      include: timelineInclude,
    });
    await audit(tx, {
      familyId,
      actorId: currentUser(req).id,
      action: 'timeline.update',
      entityType: 'TimelineEvent',
      entityId: e.id,
      before,
      after: input,
    });
    return e;
  });
  ok(res, await timelineDto(event));
});

timelineRouter.delete('/timeline/:eventId', familyAccess('EDITOR'), async (req, res) => {
  const familyId = currentFamily(req).id;
  await prisma.$transaction(async (tx) => {
    const e = await tx.timelineEvent.findFirst({ where: { id: param(req, 'eventId'), familyId } });
    if (!e) throw notFound('Voqea');
    await tx.timelineEvent.delete({ where: { id: e.id } });
    await audit(tx, {
      familyId,
      actorId: currentUser(req).id,
      action: 'timeline.delete',
      entityType: 'TimelineEvent',
      entityId: e.id,
      before: e,
    });
  });
  res.status(204).end();
});
