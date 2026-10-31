import { Router } from 'express';
import { changePasswordSchema, updateProfileSchema } from '@avlod/shared';
import { prisma } from '../../lib/prisma';
import { body, ok } from '../../lib/http';
import { badRequest, notFound } from '../../lib/errors';
import { hashPassword, verifyPassword } from '../../lib/password';
import { requireAuth } from '../../middleware/auth';
import { currentUser } from '../../middleware/family';
import { audit } from '../../lib/audit';
import { issueSession, userDto } from '../auth/auth.service';

export const usersRouter = Router();
usersRouter.use(requireAuth);

usersRouter.get('/me', async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: currentUser(req).id } });
  if (!user) throw notFound('Foydalanuvchi');
  ok(res, userDto(user));
});

usersRouter.patch('/me', async (req, res) => {
  const input = body(req, updateProfileSchema);
  const user = await prisma.user.update({ where: { id: currentUser(req).id }, data: input });
  ok(res, userDto(user));
});

usersRouter.get('/me/sessions', async (req, res) => {
  const sessions = await prisma.refreshSession.findMany({
    where: { userId: currentUser(req).id, revokedAt: null, expiresAt: { gt: new Date() } },
    select: { id: true, userAgent: true, createdAt: true, expiresAt: true },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
  ok(res, sessions);
});

/** Changing the password revokes every session and returns a fresh one for this device. */
usersRouter.post('/me/password', async (req, res) => {
  const { currentPassword, newPassword } = body(req, changePasswordSchema);
  const user = await prisma.user.findUniqueOrThrow({ where: { id: currentUser(req).id } });
  if (!(await verifyPassword(currentPassword, user.passwordHash))) {
    throw badRequest("Joriy parol noto'g'ri.", undefined, 'WRONG_PASSWORD');
  }
  // Round down to whole seconds: access tokens record the change time in seconds.
  const changedAt = new Date(Math.floor(Date.now() / 1000) * 1000);
  const updated = await prisma.$transaction(async (tx) => {
    await tx.refreshSession.updateMany({
      where: { userId: user.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    await audit(tx, {
      actorId: user.id,
      action: 'user.password_change',
      entityType: 'User',
      entityId: user.id,
      ip: req.ip,
    });
    return tx.user.update({
      where: { id: user.id },
      data: { passwordHash: await hashPassword(newPassword), passwordChangedAt: changedAt },
    });
  });
  ok(res, await issueSession(req, res, updated));
});
