import { Router } from 'express';
import { z } from 'zod';
import {
  assignableRoles,
  familyCreateSchema,
  familyUpdateSchema,
  memberRoleUpdateSchema,
  type FamilySummaryDTO,
  type MemberDTO,
} from '@avlod/shared';
import { prisma } from '../../lib/prisma';
import { body, ok, param } from '../../lib/http';
import { badRequest, forbidden, notFound } from '../../lib/errors';
import { audit } from '../../lib/audit';
import { requireAuth } from '../../middleware/auth';
import { currentFamily, currentUser, familyAccess } from '../../middleware/family';

export const familiesRouter = Router();
familiesRouter.use(requireAuth);

familiesRouter.get('/', async (req, res) => {
  const memberships = await prisma.familyMembership.findMany({
    where: { userId: currentUser(req).id, family: { deletedAt: null } },
    include: {
      family: {
        include: {
          _count: { select: { memberships: true, persons: { where: { deletedAt: null } } } },
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  });
  const data: FamilySummaryDTO[] = memberships.map((m) => ({
    id: m.family.id,
    name: m.family.name,
    description: m.family.description,
    isDemo: m.family.isDemo,
    role: m.role,
    memberCount: m.family._count.memberships,
    personCount: m.family._count.persons,
    createdAt: m.family.createdAt.toISOString(),
  }));
  ok(res, data);
});

familiesRouter.post('/', async (req, res) => {
  const input = body(req, familyCreateSchema);
  const user = currentUser(req);
  const family = await prisma.$transaction(async (tx) => {
    const f = await tx.family.create({ data: { ...input, createdById: user.id } });
    await tx.familyMembership.create({ data: { familyId: f.id, userId: user.id, role: 'OWNER' } });
    await audit(tx, {
      familyId: f.id,
      actorId: user.id,
      action: 'family.create',
      entityType: 'Family',
      entityId: f.id,
      after: input,
    });
    return f;
  });
  ok(
    res,
    {
      id: family.id,
      name: family.name,
      description: family.description,
      isDemo: false,
      role: 'OWNER',
      memberCount: 1,
      personCount: 0,
      createdAt: family.createdAt.toISOString(),
    } satisfies FamilySummaryDTO,
    201,
  );
});

familiesRouter.get('/:familyId', familyAccess('VIEWER'), async (req, res) => {
  const { id, role } = currentFamily(req);
  const f = await prisma.family.findUniqueOrThrow({
    where: { id },
    include: { _count: { select: { memberships: true, persons: { where: { deletedAt: null } } } } },
  });
  ok(res, {
    id: f.id,
    name: f.name,
    description: f.description,
    isDemo: f.isDemo,
    role,
    memberCount: f._count.memberships,
    personCount: f._count.persons,
    createdAt: f.createdAt.toISOString(),
  } satisfies FamilySummaryDTO);
});

familiesRouter.patch('/:familyId', familyAccess('ADMIN'), async (req, res) => {
  const input = body(req, familyUpdateSchema);
  const { id } = currentFamily(req);
  const before = await prisma.family.findUniqueOrThrow({ where: { id } });
  const f = await prisma.$transaction(async (tx) => {
    const updated = await tx.family.update({ where: { id }, data: input });
    await audit(tx, {
      familyId: id,
      actorId: currentUser(req).id,
      action: 'family.update',
      entityType: 'Family',
      entityId: id,
      before: { name: before.name, description: before.description },
      after: input,
    });
    return updated;
  });
  ok(res, { id: f.id, name: f.name, description: f.description });
});

/** Owner-only. Workspaces are archived (soft-deleted) — records are retained for recovery. */
familiesRouter.delete('/:familyId', familyAccess('OWNER'), async (req, res) => {
  const { confirmName } = body(req, z.object({ confirmName: z.string() }));
  const { id } = currentFamily(req);
  const f = await prisma.family.findUniqueOrThrow({ where: { id } });
  if (confirmName.trim() !== f.name)
    throw badRequest(
      'Tasdiqlash uchun oila nomini aynan kiriting.',
      undefined,
      'CONFIRMATION_MISMATCH',
    );
  await prisma.$transaction(async (tx) => {
    await tx.family.update({ where: { id }, data: { deletedAt: new Date() } });
    await tx.familyInvitation.updateMany({
      where: { familyId: id, status: 'PENDING' },
      data: { status: 'REVOKED' },
    });
    await audit(tx, {
      familyId: id,
      actorId: currentUser(req).id,
      action: 'family.archive',
      entityType: 'Family',
      entityId: id,
      ip: req.ip,
    });
  });
  res.status(204).end();
});

// ─── Members ─────────────────────────────────────────────────────────────────

familiesRouter.get('/:familyId/members', familyAccess('VIEWER'), async (req, res) => {
  const members = await prisma.familyMembership.findMany({
    where: { familyId: currentFamily(req).id },
    include: { user: { select: { displayName: true, email: true } } },
    orderBy: { createdAt: 'asc' },
  });
  const data: MemberDTO[] = members.map((m) => ({
    id: m.id,
    userId: m.userId,
    displayName: m.user.displayName,
    email: m.user.email,
    role: m.role,
    joinedAt: m.createdAt.toISOString(),
  }));
  ok(res, data);
});

familiesRouter.patch('/:familyId/members/:memberId', familyAccess('ADMIN'), async (req, res) => {
  const { role } = body(req, memberRoleUpdateSchema);
  const family = currentFamily(req);
  const actor = currentUser(req);
  const target = await prisma.familyMembership.findFirst({
    where: { id: param(req, 'memberId'), familyId: family.id },
  });
  if (!target) throw notFound("A'zo");
  if (target.userId === actor.id) throw forbidden("O'z rolingizni o'zgartira olmaysiz.");
  if (target.role === 'OWNER') throw forbidden('Egasining rolini o‘zgartirib bo‘lmaydi.');

  if (role === 'OWNER') {
    // Ownership transfer: only the owner, and the previous owner becomes an administrator.
    if (family.role !== 'OWNER') throw forbidden();
    await prisma.$transaction(async (tx) => {
      await tx.familyMembership.update({ where: { id: target.id }, data: { role: 'OWNER' } });
      await tx.familyMembership.update({
        where: { familyId_userId: { familyId: family.id, userId: actor.id } },
        data: { role: 'ADMIN' },
      });
      await audit(tx, {
        familyId: family.id,
        actorId: actor.id,
        action: 'member.transfer_ownership',
        entityType: 'FamilyMembership',
        entityId: target.id,
      });
    });
    ok(res, { id: target.id, role: 'OWNER' });
    return;
  }
  const allowed = assignableRoles(family.role);
  if (!allowed.includes(role) || (target.role === 'ADMIN' && family.role !== 'OWNER'))
    throw forbidden();
  const updated = await prisma.$transaction(async (tx) => {
    const m = await tx.familyMembership.update({ where: { id: target.id }, data: { role } });
    await audit(tx, {
      familyId: family.id,
      actorId: actor.id,
      action: 'member.role_change',
      entityType: 'FamilyMembership',
      entityId: target.id,
      before: { role: target.role },
      after: { role },
    });
    return m;
  });
  ok(res, { id: updated.id, role: updated.role });
});

/** Admins remove members below them; any non-owner member may leave. */
familiesRouter.delete('/:familyId/members/:memberId', familyAccess('VIEWER'), async (req, res) => {
  const family = currentFamily(req);
  const actor = currentUser(req);
  const target = await prisma.familyMembership.findFirst({
    where: { id: param(req, 'memberId'), familyId: family.id },
  });
  if (!target) throw notFound("A'zo");
  const leaving = target.userId === actor.id;
  if (target.role === 'OWNER')
    throw forbidden('Egasi oiladan chiqishdan oldin egalikni boshqa a’zoga topshirishi kerak.');
  if (!leaving) {
    const canRemove =
      family.role === 'OWNER' ||
      (family.role === 'ADMIN' && (target.role === 'EDITOR' || target.role === 'VIEWER'));
    if (!canRemove) throw forbidden();
  }
  await prisma.$transaction(async (tx) => {
    await tx.familyMembership.delete({ where: { id: target.id } });
    await audit(tx, {
      familyId: family.id,
      actorId: actor.id,
      action: leaving ? 'member.leave' : 'member.remove',
      entityType: 'FamilyMembership',
      entityId: target.id,
      before: { userId: target.userId, role: target.role },
    });
  });
  res.status(204).end();
});

familiesRouter.get('/:familyId/audit', familyAccess('ADMIN'), async (req, res) => {
  const entries = await prisma.auditLog.findMany({
    where: { familyId: currentFamily(req).id },
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: { actor: { select: { displayName: true } } },
  });
  ok(
    res,
    entries.map((e) => ({
      id: e.id,
      action: e.action,
      entityType: e.entityType,
      entityId: e.entityId,
      actor: e.actor?.displayName ?? null,
      createdAt: e.createdAt.toISOString(),
    })),
  );
});
