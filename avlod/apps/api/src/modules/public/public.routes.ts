import { Router, type Request } from 'express';
import { treeQuerySchema, type PublicDemoDTO } from '@avlod/shared';
import { env } from '../../config/env';
import { prisma } from '../../lib/prisma';
import { notFound } from '../../lib/errors';
import { ok, param, query } from '../../lib/http';
import { personDetail, type Viewer } from '../../lib/mappers';
import { buildTree, familyStats, generationOf, relativesOf } from '../people/people.service';
import {
  memoryDto,
  memoryInclude,
  timelineDto,
  timelineInclude,
} from '../memories/memories.service';

/**
 * Read-only access to the clearly-labelled fictional demo family (Family.isPublicDemo).
 * Anonymous viewers get the strictest privacy level for living people.
 */
export const publicRouter = Router();

const anonymous: Viewer = { role: null };

async function demoFamilyId(_req: Request): Promise<string> {
  if (!env.PUBLIC_DEMO_ENABLED) throw notFound('Namuna oila');
  const f = await prisma.family.findFirst({
    where: { isPublicDemo: true, isDemo: true, deletedAt: null },
    select: { id: true },
  });
  if (!f) throw notFound('Namuna oila');
  return f.id;
}

publicRouter.get('/demo', async (req, res) => {
  const id = await demoFamilyId(req);
  const f = await prisma.family.findUniqueOrThrow({ where: { id } });
  const data: PublicDemoDTO = {
    family: { id: f.id, name: f.name, description: f.description },
    stats: await familyStats(id),
  };
  ok(res, data);
});

publicRouter.get('/demo/tree', async (req, res) => {
  const q = query(req, treeQuerySchema);
  ok(res, await buildTree(await demoFamilyId(req), anonymous, q));
});

publicRouter.get('/demo/people/:personId', async (req, res) => {
  const familyId = await demoFamilyId(req);
  const personId = param(req, 'personId');
  const person = await prisma.person.findFirst({
    where: { id: personId, familyId, deletedAt: null },
    include: { portrait: true },
  });
  if (!person) throw notFound('Shaxs');
  const [relatives, generation] = await Promise.all([
    relativesOf(familyId, personId, anonymous),
    generationOf(familyId, personId),
  ]);
  ok(res, { person: await personDetail(person, anonymous), relatives, generation, photos: [] });
});

publicRouter.get('/demo/timeline', async (req, res) => {
  const events = await prisma.timelineEvent.findMany({
    where: { familyId: await demoFamilyId(req) },
    include: timelineInclude,
    orderBy: [{ year: { sort: 'asc', nulls: 'last' } }],
    take: 60,
  });
  ok(res, await Promise.all(events.map(timelineDto)));
});

publicRouter.get('/demo/memories', async (req, res) => {
  const rows = await prisma.memory.findMany({
    where: { familyId: await demoFamilyId(req) },
    include: memoryInclude,
    orderBy: [{ year: { sort: 'asc', nulls: 'last' } }],
    take: 60,
  });
  ok(res, await Promise.all(rows.map(memoryDto)));
});
