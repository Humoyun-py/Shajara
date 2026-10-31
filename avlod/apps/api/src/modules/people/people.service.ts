import { Prisma, type ParentType, type UnionType, type VerificationStatus } from '@prisma/client';
import {
  computeGenerations,
  countBranches,
  normalizePair,
  RELATION_ERROR_MESSAGES,
  validateParentLink,
  type PersonCreateInput,
  type RelativesDTO,
  type StatsDTO,
  type TreeDTO,
  type personUpdateSchema,
  type unionCreateSchema,
} from '@avlod/shared';
import type { z } from 'zod';
import { lockFamilyTree, prisma, type Tx } from '../../lib/prisma';
import { badRequest, conflict, notFound } from '../../lib/errors';
import { audit } from '../../lib/audit';
import {
  flattenDate,
  parentLinkDto,
  personSummary,
  unionDto,
  type Viewer,
} from '../../lib/mappers';

/** Full tree is returned when the family is at most this large; otherwise a window around a root. */
export const FULL_TREE_LIMIT = 600;

type PersonInput = z.output<typeof personUpdateSchema>;

export function personData(input: PersonInput) {
  const { birth, death, ...rest } = input;
  return { ...rest, ...flattenDate('birth', birth), ...flattenDate('death', death) };
}

export async function requirePerson(tx: Tx, familyId: string, personId: string) {
  const p = await tx.person.findFirst({ where: { id: personId, familyId, deletedAt: null } });
  if (!p) throw notFound('Shaxs');
  return p;
}

function relationError(code: keyof typeof RELATION_ERROR_MESSAGES): never {
  throw conflict(RELATION_ERROR_MESSAGES[code], code);
}

/** True when `ancestorCandidate` is already a descendant of `personId` (recursive CTE). */
async function isDescendant(
  tx: Tx,
  familyId: string,
  personId: string,
  candidate: string,
): Promise<boolean> {
  const rows = await tx.$queryRaw<{ found: boolean }[]>`
    WITH RECURSIVE d(id) AS (
      SELECT r."childId" FROM "ParentChildRelationship" r
       WHERE r."parentId" = ${personId}::uuid AND r."familyId" = ${familyId}::uuid
      UNION
      SELECT r."childId" FROM "ParentChildRelationship" r
        JOIN d ON r."parentId" = d.id
       WHERE r."familyId" = ${familyId}::uuid
    )
    SELECT EXISTS (SELECT 1 FROM d WHERE d.id = ${candidate}::uuid) AS found`;
  return rows[0]?.found ?? false;
}

async function partnerIds(tx: Tx, personId: string): Promise<string[]> {
  const unions = await tx.union.findMany({
    where: { OR: [{ partnerAId: personId }, { partnerBId: personId }] },
    select: { partnerAId: true, partnerBId: true },
  });
  return unions.map((u) => (u.partnerAId === personId ? u.partnerBId : u.partnerAId));
}

export interface ParentLinkInput {
  parentId: string;
  childId: string;
  type: ParentType;
  verification: VerificationStatus;
  notes: string | null;
}

/** Validates and creates a parent→child link. Caller must hold the family tree lock. */
export async function createParentLink(
  tx: Tx,
  familyId: string,
  actorId: string,
  input: ParentLinkInput,
) {
  if (input.parentId === input.childId) relationError('SELF_RELATION');
  await requirePerson(tx, familyId, input.parentId);
  await requirePerson(tx, familyId, input.childId);
  const existing = await tx.parentChildRelationship.findMany({
    where: { childId: input.childId, familyId },
    select: { parentId: true, childId: true, type: true },
  });
  const error = validateParentLink({
    ...input,
    existingParentsOfChild: existing,
    childPartnerIds: await partnerIds(tx, input.childId),
    createsCycle: await isDescendant(tx, familyId, input.childId, input.parentId),
  });
  if (error) relationError(error);
  const link = await tx.parentChildRelationship.create({ data: { ...input, familyId } });
  await audit(tx, {
    familyId,
    actorId,
    action: 'relationship.parent.create',
    entityType: 'ParentChildRelationship',
    entityId: link.id,
    after: input,
  });
  return link;
}

export async function createUnion(
  tx: Tx,
  familyId: string,
  actorId: string,
  input: Omit<z.output<typeof unionCreateSchema>, 'type'> & { type: UnionType },
) {
  if (input.partnerAId === input.partnerBId) relationError('SELF_RELATION');
  const [a, b] = normalizePair(input.partnerAId, input.partnerBId);
  await requirePerson(tx, familyId, a);
  await requirePerson(tx, familyId, b);
  const direct = await tx.parentChildRelationship.findFirst({
    where: {
      familyId,
      OR: [
        { parentId: a, childId: b },
        { parentId: b, childId: a },
      ],
    },
  });
  if (direct) relationError('PARTNER_AS_PARENT');
  const dup = await tx.union.findUnique({
    where: { partnerAId_partnerBId: { partnerAId: a, partnerBId: b } },
  });
  if (dup) relationError('DUPLICATE_UNION');
  if (input.startYear && input.endYear && input.endYear < input.startYear) {
    throw badRequest('Tugash yili boshlanish yilidan oldin bo‘lishi mumkin emas.');
  }
  const union = await tx.union.create({
    data: { ...input, partnerAId: a, partnerBId: b, familyId },
  });
  await audit(tx, {
    familyId,
    actorId,
    action: 'relationship.union.create',
    entityType: 'Union',
    entityId: union.id,
    after: input,
  });
  return union;
}

/** Creates a person, optionally connected to an existing relative, atomically. */
export async function createPerson(
  familyId: string,
  actorId: string,
  person: z.output<typeof personUpdateSchema> & { givenName: string },
  relation?: {
    to: string;
    kind: 'PARENT_OF' | 'CHILD_OF' | 'PARTNER_OF';
    parentType: ParentType;
    unionType: UnionType;
  },
) {
  return prisma.$transaction(async (tx) => {
    await lockFamilyTree(tx, familyId);
    const created = await tx.person.create({
      data: { ...personData(person), givenName: person.givenName, familyId, createdById: actorId },
    });
    await audit(tx, {
      familyId,
      actorId,
      action: 'person.create',
      entityType: 'Person',
      entityId: created.id,
      after: person,
    });
    if (relation) {
      if (relation.kind === 'PARTNER_OF') {
        await createUnion(tx, familyId, actorId, {
          partnerAId: created.id,
          partnerBId: relation.to,
          type: relation.unionType,
          status: 'UNKNOWN',
          startYear: null,
          endYear: null,
          verification: 'UNVERIFIED',
          notes: null,
        });
      } else {
        const parentId = relation.kind === 'PARENT_OF' ? created.id : relation.to;
        const childId = relation.kind === 'PARENT_OF' ? relation.to : created.id;
        await createParentLink(tx, familyId, actorId, {
          parentId,
          childId,
          type: relation.parentType,
          verification: 'UNVERIFIED',
          notes: null,
        });
      }
    }
    return created;
  });
}

export type { PersonCreateInput };

/**
 * Deletion policy: a person with relationships is not removed unless `detach` is set.
 * With `detach`, their relationship rows and memory tags are removed and the person is
 * archived (soft-deleted) — all inside one audited transaction. Nobody else is touched.
 */
export async function deletePerson(
  familyId: string,
  actorId: string,
  personId: string,
  detach: boolean,
) {
  return prisma.$transaction(async (tx) => {
    await lockFamilyTree(tx, familyId);
    const person = await requirePerson(tx, familyId, personId);
    const links = await tx.parentChildRelationship.findMany({
      where: { familyId, OR: [{ parentId: personId }, { childId: personId }] },
    });
    const unions = await tx.union.findMany({
      where: { familyId, OR: [{ partnerAId: personId }, { partnerBId: personId }] },
    });
    if ((links.length || unions.length) && !detach) {
      throw conflict(
        `Bu shaxsning ${links.length} ta ota-ona/farzand va ${unions.length} ta juftlik bog'lanishi bor. O'chirish uchun bog'lanishlarni ham uzishni tasdiqlang.`,
        'HAS_RELATIONSHIPS',
      );
    }
    await tx.parentChildRelationship.deleteMany({ where: { id: { in: links.map((l) => l.id) } } });
    await tx.union.deleteMany({ where: { id: { in: unions.map((u) => u.id) } } });
    await tx.memoryPerson.deleteMany({ where: { personId } });
    await tx.timelineEvent.updateMany({ where: { familyId, personId }, data: { personId: null } });
    await tx.familyMembership.updateMany({
      where: { familyId, personId },
      data: { personId: null },
    });
    await tx.person.update({ where: { id: personId }, data: { deletedAt: new Date() } });
    await audit(tx, {
      familyId,
      actorId,
      action: 'person.delete',
      entityType: 'Person',
      entityId: personId,
      before: { person, links, unions },
    });
  });
}

// ─── Reads ───────────────────────────────────────────────────────────────────

const withPortrait = { portrait: true } as const;

export async function relativesOf(
  familyId: string,
  personId: string,
  viewer: Viewer,
): Promise<RelativesDTO> {
  const [parentLinks, childLinks, unions] = await Promise.all([
    prisma.parentChildRelationship.findMany({
      where: { familyId, childId: personId, parent: { deletedAt: null } },
      include: { parent: { include: withPortrait } },
    }),
    prisma.parentChildRelationship.findMany({
      where: { familyId, parentId: personId, child: { deletedAt: null } },
      include: { child: { include: withPortrait } },
    }),
    prisma.union.findMany({
      where: { familyId, OR: [{ partnerAId: personId }, { partnerBId: personId }] },
      include: { partnerA: { include: withPortrait }, partnerB: { include: withPortrait } },
    }),
  ]);
  const parentIds = parentLinks.map((l) => l.parentId);
  const siblingLinks = parentIds.length
    ? await prisma.parentChildRelationship.findMany({
        where: {
          familyId,
          parentId: { in: parentIds },
          childId: { not: personId },
          child: { deletedAt: null },
        },
        include: { child: { include: withPortrait } },
      })
    : [];
  // FULL: shares two biological parents; HALF: shares one; OTHER: related only through adoptive/step/etc.
  const myBioParents = new Set(
    parentLinks.filter((l) => l.type === 'BIOLOGICAL').map((l) => l.parentId),
  );
  const siblingMap = new Map<
    string,
    { person: (typeof siblingLinks)[number]['child']; sharedBio: number }
  >();
  for (const l of siblingLinks) {
    const entry = siblingMap.get(l.childId) ?? { person: l.child, sharedBio: 0 };
    if (l.type === 'BIOLOGICAL' && myBioParents.has(l.parentId)) entry.sharedBio += 1;
    siblingMap.set(l.childId, entry);
  }
  return {
    parents: await Promise.all(
      parentLinks.map(async (l) => ({
        person: await personSummary(l.parent, viewer),
        link: parentLinkDto(l),
      })),
    ),
    children: await Promise.all(
      childLinks.map(async (l) => ({
        person: await personSummary(l.child, viewer),
        link: parentLinkDto(l),
      })),
    ),
    partners: await Promise.all(
      unions
        .filter((u) => !(u.partnerAId === personId ? u.partnerB : u.partnerA).deletedAt)
        .map(async (u) => ({
          person: await personSummary(u.partnerAId === personId ? u.partnerB : u.partnerA, viewer),
          union: unionDto(u),
        })),
    ),
    siblings: await Promise.all(
      [...siblingMap.values()].map(async (s) => ({
        person: await personSummary(s.person, viewer),
        shared:
          s.sharedBio >= 2
            ? ('FULL' as const)
            : s.sharedBio === 1
              ? ('HALF' as const)
              : ('OTHER' as const),
      })),
    ),
  };
}

/** Depth of the longest known ancestor chain above a person (0 = no known parents). */
export async function generationOf(familyId: string, personId: string): Promise<number> {
  const rows = await prisma.$queryRaw<{ depth: number | null }[]>`
    WITH RECURSIVE a(id, depth) AS (
      SELECT ${personId}::uuid, 0
      UNION
      SELECT r."parentId", a.depth + 1 FROM "ParentChildRelationship" r
        JOIN a ON r."childId" = a.id
       WHERE r."familyId" = ${familyId}::uuid AND a.depth < 200
    )
    SELECT MAX(depth)::int AS depth FROM a`;
  return rows[0]?.depth ?? 0;
}

async function windowIds(
  familyId: string,
  rootId: string,
  up: number,
  down: number,
): Promise<string[]> {
  const rows = await prisma.$queryRaw<{ id: string }[]>`
    WITH RECURSIVE
    anc(id, depth) AS (
      SELECT ${rootId}::uuid, 0
      UNION
      SELECT r."parentId", anc.depth + 1 FROM "ParentChildRelationship" r
        JOIN anc ON r."childId" = anc.id
       WHERE r."familyId" = ${familyId}::uuid AND anc.depth < ${up}
    ),
    des(id, depth) AS (
      SELECT ${rootId}::uuid, 0
      UNION
      SELECT r."childId", des.depth + 1 FROM "ParentChildRelationship" r
        JOIN des ON r."parentId" = des.id
       WHERE r."familyId" = ${familyId}::uuid AND des.depth < ${down}
    ),
    core AS (SELECT id FROM anc UNION SELECT id FROM des),
    siblings AS (
      SELECT r2."childId" AS id FROM "ParentChildRelationship" r1
        JOIN "ParentChildRelationship" r2 ON r2."parentId" = r1."parentId"
       WHERE r1."childId" = ${rootId}::uuid AND r1."familyId" = ${familyId}::uuid
    ),
    withSiblings AS (SELECT id FROM core UNION SELECT id FROM siblings),
    partners AS (
      SELECT CASE WHEN u."partnerAId" = w.id THEN u."partnerBId" ELSE u."partnerAId" END AS id
        FROM "Union" u JOIN withSiblings w ON w.id IN (u."partnerAId", u."partnerBId")
       WHERE u."familyId" = ${familyId}::uuid
    )
    SELECT DISTINCT id FROM (SELECT id FROM withSiblings UNION SELECT id FROM partners) x`;
  return rows.map((r) => r.id);
}

/** Picks a sensible default root: the earliest-born founder with the largest descendant line. */
async function defaultRoot(familyId: string): Promise<string | null> {
  const rows = await prisma.$queryRaw<{ id: string }[]>`
    SELECT p.id FROM "Person" p
     WHERE p."familyId" = ${familyId}::uuid AND p."deletedAt" IS NULL
       AND NOT EXISTS (SELECT 1 FROM "ParentChildRelationship" r WHERE r."childId" = p.id)
     ORDER BY (SELECT COUNT(*) FROM "ParentChildRelationship" r WHERE r."parentId" = p.id) DESC,
              p."birthYear" ASC NULLS LAST, p."createdAt" ASC
     LIMIT 1`;
  return rows[0]?.id ?? null;
}

export async function buildTree(
  familyId: string,
  viewer: Viewer,
  opts: { rootId?: string; up: number; down: number },
): Promise<TreeDTO> {
  const totalPersons = await prisma.person.count({ where: { familyId, deletedAt: null } });
  let ids: string[] | null = null;
  let rootId = opts.rootId ?? null;
  if (rootId) await requirePerson(prisma, familyId, rootId);
  if (rootId || totalPersons > FULL_TREE_LIMIT) {
    rootId ??= await defaultRoot(familyId);
    ids = rootId ? await windowIds(familyId, rootId, opts.up, opts.down) : [];
  }
  const persons = await prisma.person.findMany({
    where: { familyId, deletedAt: null, ...(ids ? { id: { in: ids } } : {}) },
    include: withPortrait,
    take: ids ? undefined : FULL_TREE_LIMIT,
  });
  const idSet = new Set(persons.map((p) => p.id));
  const idList = [...idSet];
  const [touchingLinks, unions] = await Promise.all([
    prisma.parentChildRelationship.findMany({
      where: { familyId, OR: [{ parentId: { in: idList } }, { childId: { in: idList } }] },
    }),
    prisma.union.findMany({
      where: { familyId, partnerAId: { in: idList }, partnerBId: { in: idList } },
    }),
  ]);
  const links = touchingLinks.filter((l) => idSet.has(l.parentId) && idSet.has(l.childId));
  const expandable = new Map<string, { up: boolean; down: boolean }>();
  for (const l of touchingLinks) {
    if (idSet.has(l.childId) && !idSet.has(l.parentId)) {
      expandable.set(l.childId, {
        ...(expandable.get(l.childId) ?? { up: false, down: false }),
        up: true,
      });
    }
    if (idSet.has(l.parentId) && !idSet.has(l.childId)) {
      expandable.set(l.parentId, {
        ...(expandable.get(l.parentId) ?? { up: false, down: false }),
        down: true,
      });
    }
  }
  const generations = computeGenerations(idList, links, unions);
  return {
    persons: await Promise.all(
      persons.map(async (p) => ({
        ...(await personSummary(p, viewer)),
        generation: generations.get(p.id) ?? 0,
      })),
    ),
    parentLinks: links.map(parentLinkDto),
    unions: unions.map(unionDto),
    rootId,
    totalPersons,
    truncated: ids !== null && ids.length < totalPersons,
    expandable: [...expandable.entries()].map(([personId, e]) => ({ personId, ...e })),
  };
}

export async function familyStats(familyId: string): Promise<StatsDTO> {
  const [persons, links, unions, memories, depthRows] = await Promise.all([
    prisma.person.findMany({ where: { familyId, deletedAt: null }, select: { id: true } }),
    prisma.parentChildRelationship.findMany({
      where: { familyId },
      select: { parentId: true, childId: true },
    }),
    prisma.union.findMany({ where: { familyId }, select: { partnerAId: true, partnerBId: true } }),
    prisma.memory.count({ where: { familyId } }),
    prisma.$queryRaw<{ depth: number | null }[]>`
      WITH RECURSIVE g(id, depth) AS (
        SELECT p.id, 1 FROM "Person" p
         WHERE p."familyId" = ${familyId}::uuid AND p."deletedAt" IS NULL
           AND NOT EXISTS (SELECT 1 FROM "ParentChildRelationship" r WHERE r."childId" = p.id)
        UNION
        SELECT r."childId", g.depth + 1 FROM "ParentChildRelationship" r
          JOIN g ON r."parentId" = g.id
         WHERE r."familyId" = ${familyId}::uuid AND g.depth < 200
      )
      SELECT MAX(depth)::int AS depth FROM g`,
  ]);
  const ids = persons.map((p) => p.id);
  const generations = computeGenerations(ids, links, unions);
  return {
    familyMembers: ids.length,
    generations: depthRows[0]?.depth ?? 0,
    branches: countBranches(ids, links, generations),
    memories,
  };
}

export const personSearchWhere = (familyId: string, q: string): Prisma.PersonWhereInput => {
  const terms = q.split(/\s+/).filter(Boolean).slice(0, 4);
  return {
    familyId,
    deletedAt: null,
    AND: terms.map((t) => ({
      OR: [
        { givenName: { contains: t, mode: 'insensitive' } },
        { familyName: { contains: t, mode: 'insensitive' } },
        { patronymic: { contains: t, mode: 'insensitive' } },
        { maidenName: { contains: t, mode: 'insensitive' } },
      ],
    })),
  };
};
