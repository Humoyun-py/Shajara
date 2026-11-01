import { Router } from 'express';
import { z } from 'zod';
import {
  invitationCreateSchema,
  type InvitationDTO,
  type InvitationPreviewDTO,
} from '@avlod/shared';
import type { FamilyInvitation, User } from '../../generated/prisma/client';
import { env } from '../../config/env';
import { prisma } from '../../lib/prisma';
import { body, ok, param } from '../../lib/http';
import { badRequest, conflict, forbidden, notFound } from '../../lib/errors';
import { hashToken, randomToken } from '../../lib/tokens';
import { audit } from '../../lib/audit';
import { sendMail } from '../../lib/mailer';
import { requireAuth } from '../../middleware/auth';
import { currentFamily, currentUser, familyAccess } from '../../middleware/family';

/** Mounted at /families/:familyId/invitations */
export const familyInvitationsRouter = Router({ mergeParams: true });
/** Mounted at /invitations */
export const invitationsRouter = Router();

const dto = (
  i: FamilyInvitation & { invitedBy?: Pick<User, 'displayName'> | null },
): InvitationDTO => ({
  id: i.id,
  email: i.email,
  role: i.role,
  status: i.status === 'PENDING' && i.expiresAt < new Date() ? 'EXPIRED' : i.status,
  expiresAt: i.expiresAt.toISOString(),
  createdAt: i.createdAt.toISOString(),
  invitedBy: i.invitedBy?.displayName ?? null,
});

familyInvitationsRouter.use(requireAuth);

familyInvitationsRouter.get('/', familyAccess('ADMIN'), async (req, res) => {
  const list = await prisma.familyInvitation.findMany({
    where: { familyId: currentFamily(req).id },
    include: { invitedBy: { select: { displayName: true } } },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });
  ok(res, list.map(dto));
});

familyInvitationsRouter.post('/', familyAccess('ADMIN'), async (req, res) => {
  const input = body(req, invitationCreateSchema);
  const family = currentFamily(req);
  const actor = currentUser(req);
  if (input.role === 'ADMIN' && family.role !== 'OWNER')
    throw forbidden('Administratorni faqat egasi taklif qila oladi.');

  const alreadyMember = await prisma.familyMembership.findFirst({
    where: { familyId: family.id, user: { email: input.email } },
  });
  if (alreadyMember) throw conflict("Bu foydalanuvchi allaqachon oila a'zosi.", 'ALREADY_MEMBER');

  const { token, hash } = randomToken(32);
  const f = await prisma.family.findUniqueOrThrow({
    where: { id: family.id },
    select: { name: true },
  });
  const invitation = await prisma.$transaction(async (tx) => {
    // A newer invitation replaces any pending one for the same address.
    await tx.familyInvitation.updateMany({
      where: { familyId: family.id, email: input.email, status: 'PENDING' },
      data: { status: 'REVOKED' },
    });
    const inv = await tx.familyInvitation.create({
      data: {
        familyId: family.id,
        email: input.email,
        role: input.role,
        tokenHash: hash,
        invitedById: actor.id,
        expiresAt: new Date(Date.now() + input.expiresInDays * 86_400_000),
      },
      include: { invitedBy: { select: { displayName: true } } },
    });
    await audit(tx, {
      familyId: family.id,
      actorId: actor.id,
      action: 'invitation.create',
      entityType: 'FamilyInvitation',
      entityId: inv.id,
      after: { email: input.email, role: input.role },
    });
    return inv;
  });
  const acceptUrl = `${env.WEB_ORIGIN}/invitations/${token}`;
  await sendMail({
    to: input.email,
    subject: `AVLOD — "${f.name}" oilasiga taklif`,
    text: `${actor.displayName} sizni AVLOD platformasidagi "${f.name}" oila shajarasiga taklif qildi.\n\nTaklifni ko'rish: ${acceptUrl}\nTaklif ${input.expiresInDays} kun amal qiladi.`,
  });
  ok(res, { ...dto(invitation), acceptUrl }, 201);
});

familyInvitationsRouter.delete('/:invitationId', familyAccess('ADMIN'), async (req, res) => {
  const family = currentFamily(req);
  const inv = await prisma.familyInvitation.findFirst({
    where: { id: param(req, 'invitationId'), familyId: family.id },
  });
  if (!inv) throw notFound('Taklif');
  if (inv.status !== 'PENDING')
    throw badRequest('Faqat kutilayotgan taklifni bekor qilish mumkin.');
  await prisma.$transaction(async (tx) => {
    await tx.familyInvitation.update({ where: { id: inv.id }, data: { status: 'REVOKED' } });
    await audit(tx, {
      familyId: family.id,
      actorId: currentUser(req).id,
      action: 'invitation.revoke',
      entityType: 'FamilyInvitation',
      entityId: inv.id,
    });
  });
  res.status(204).end();
});

// ─── Invitee side ───────────────────────────────────────────────────────────

const tokenSchema = z.object({ token: z.string().min(20).max(200) });

async function findByToken(token: string) {
  const inv = await prisma.familyInvitation.findUnique({
    where: { tokenHash: hashToken(token) },
    include: {
      family: { select: { name: true, deletedAt: true } },
      invitedBy: { select: { displayName: true } },
    },
  });
  if (!inv || inv.family.deletedAt) throw notFound('Taklif');
  return inv;
}

/** Public preview, so the invitee can see what they are joining before signing in. */
invitationsRouter.get('/preview/:token', async (req, res) => {
  const inv = await findByToken(String(req.params.token));
  const preview: InvitationPreviewDTO = {
    familyName: inv.family.name,
    role: inv.role,
    email: inv.email,
    status: dto(inv).status,
    expiresAt: inv.expiresAt.toISOString(),
    invitedBy: inv.invitedBy?.displayName ?? null,
  };
  ok(res, preview);
});

async function respond(
  token: string,
  user: { id: string; email: string },
  accept: boolean,
  ip?: string,
) {
  const inv = await findByToken(token);
  if (inv.email !== user.email) throw forbidden('Bu taklif boshqa email manzil uchun yuborilgan.');
  if (inv.status !== 'PENDING')
    throw badRequest('Taklif endi faol emas.', undefined, 'INVITATION_INACTIVE');
  if (inv.expiresAt < new Date()) {
    await prisma.familyInvitation.update({ where: { id: inv.id }, data: { status: 'EXPIRED' } });
    throw badRequest('Taklif muddati tugagan.', undefined, 'INVITATION_EXPIRED');
  }
  return prisma.$transaction(async (tx) => {
    const claimed = await tx.familyInvitation.updateMany({
      where: { id: inv.id, status: 'PENDING' },
      data: { status: accept ? 'ACCEPTED' : 'DECLINED', respondedAt: new Date() },
    });
    if (claimed.count === 0)
      throw badRequest('Taklif endi faol emas.', undefined, 'INVITATION_INACTIVE');
    if (accept) {
      await tx.familyMembership.upsert({
        where: { familyId_userId: { familyId: inv.familyId, userId: user.id } },
        create: { familyId: inv.familyId, userId: user.id, role: inv.role },
        update: {},
      });
    }
    await audit(tx, {
      familyId: inv.familyId,
      actorId: user.id,
      action: accept ? 'invitation.accept' : 'invitation.decline',
      entityType: 'FamilyInvitation',
      entityId: inv.id,
      ip,
    });
    return { familyId: inv.familyId };
  });
}

invitationsRouter.post('/accept', requireAuth, async (req, res) => {
  const { token } = body(req, tokenSchema);
  ok(res, await respond(token, currentUser(req), true, req.ip));
});

invitationsRouter.post('/decline', requireAuth, async (req, res) => {
  const { token } = body(req, tokenSchema);
  ok(res, await respond(token, currentUser(req), false, req.ip));
});
