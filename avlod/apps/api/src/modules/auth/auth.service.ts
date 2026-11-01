import type { Request, Response } from 'express';
import type { User } from '../../generated/prisma/client';
import type { AuthResultDTO, UserDTO } from '@avlod/shared';
import { env } from '../../config/env';
import { prisma } from '../../lib/prisma';
import { badRequest, conflict, tooMany, unauthorized } from '../../lib/errors';
import { burnPasswordCheck, hashPassword, verifyPassword } from '../../lib/password';
import { hashToken, randomToken, signAccessToken } from '../../lib/tokens';
import { sendMail } from '../../lib/mailer';
import { audit } from '../../lib/audit';

export const REFRESH_COOKIE = 'avlod_rt';
const COOKIE_PATH = '/api/v1/auth';
const MAX_FAILED_LOGINS = 5;
const LOCK_MINUTES = 15;
const RESET_TTL_MINUTES = 30;

export const userDto = (u: User): UserDTO => ({
  id: u.id,
  email: u.email,
  displayName: u.displayName,
  locale: u.locale,
  createdAt: u.createdAt.toISOString(),
});

function setRefreshCookie(res: Response, token: string, expiresAt: Date) {
  res.cookie(REFRESH_COOKIE, token, {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: 'strict',
    path: COOKIE_PATH,
    expires: expiresAt,
  });
}

export function clearRefreshCookie(res: Response) {
  res.clearCookie(REFRESH_COOKIE, {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: 'strict',
    path: COOKIE_PATH,
  });
}

/** Creates a refresh session (stored hashed) and returns the access token payload. */
export async function issueSession(
  req: Request,
  res: Response,
  user: User,
): Promise<AuthResultDTO> {
  return (await createSession(req, res, user)).result;
}

async function createSession(req: Request, res: Response, user: User) {
  const { token, hash } = randomToken(48);
  const expiresAt = new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 86_400_000);
  const session = await prisma.refreshSession.create({
    data: {
      userId: user.id,
      tokenHash: hash,
      expiresAt,
      userAgent: req.get('user-agent')?.slice(0, 300) ?? null,
      ip: req.ip ?? null,
    },
  });
  setRefreshCookie(res, token, expiresAt);
  const access = signAccessToken(user.id, user.passwordChangedAt);
  const result: AuthResultDTO = {
    user: userDto(user),
    accessToken: access.token,
    accessTokenExpiresAt: access.expiresAt.toISOString(),
  };
  return { result, sessionId: session.id };
}

export async function register(input: { email: string; password: string; displayName: string }) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) throw conflict('Bu email bilan hisob allaqachon mavjud.', 'EMAIL_TAKEN');
  return prisma.user.create({
    data: {
      email: input.email,
      displayName: input.displayName,
      passwordHash: await hashPassword(input.password),
    },
  });
}

export async function login(email: string, password: string, ip?: string): Promise<User> {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    await burnPasswordCheck(password);
    throw unauthorized("Email yoki parol noto'g'ri.");
  }
  if (user.lockedUntil && user.lockedUntil > new Date()) {
    throw tooMany('Hisob vaqtincha bloklangan. 15 daqiqadan so‘ng qayta urinib ko‘ring.');
  }
  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    const failed = user.failedLoginCount + 1;
    const lock = failed >= MAX_FAILED_LOGINS;
    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginCount: lock ? 0 : failed,
        lockedUntil: lock ? new Date(Date.now() + LOCK_MINUTES * 60_000) : null,
      },
    });
    if (lock) {
      await audit(prisma, {
        actorId: user.id,
        action: 'auth.locked',
        entityType: 'User',
        entityId: user.id,
        ip,
      });
    }
    throw unauthorized("Email yoki parol noto'g'ri.");
  }
  if (user.failedLoginCount > 0 || user.lockedUntil) {
    return prisma.user.update({
      where: { id: user.id },
      data: { failedLoginCount: 0, lockedUntil: null },
    });
  }
  return user;
}

/**
 * Rotates a refresh token. Presenting an already-rotated token signals theft:
 * every session of that user is revoked.
 */
export async function rotate(
  req: Request,
  res: Response,
  token: string | undefined,
): Promise<AuthResultDTO> {
  if (!token) throw unauthorized('Sessiya topilmadi.');
  const session = await prisma.refreshSession.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: true },
  });
  if (!session) throw unauthorized('Sessiya topilmadi.');
  if (session.revokedAt) {
    await prisma.refreshSession.updateMany({
      where: { userId: session.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    await audit(prisma, {
      actorId: session.userId,
      action: 'auth.refresh_reuse',
      entityType: 'RefreshSession',
      entityId: session.id,
      ip: req.ip,
    });
    clearRefreshCookie(res);
    throw unauthorized('Sessiya bekor qilingan. Qayta kiring.');
  }
  if (session.expiresAt < new Date()) {
    clearRefreshCookie(res);
    throw unauthorized('Sessiya muddati tugagan.');
  }
  // Conditional update: two concurrent refreshes with the same token cannot both succeed.
  const claimed = await prisma.refreshSession.updateMany({
    where: { id: session.id, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  if (claimed.count === 0) throw unauthorized('Sessiya bekor qilingan. Qayta kiring.');
  const { result, sessionId } = await createSession(req, res, session.user);
  await prisma.refreshSession.update({
    where: { id: session.id },
    data: { replacedById: sessionId },
  });
  return result;
}

export async function revoke(token: string | undefined) {
  if (!token) return;
  await prisma.refreshSession.updateMany({
    where: { tokenHash: hashToken(token), revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function revokeAll(userId: string) {
  await prisma.refreshSession.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function requestPasswordReset(email: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return; // Same response either way: no account enumeration.
  const { token, hash } = randomToken(32);
  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash: hash,
      expiresAt: new Date(Date.now() + RESET_TTL_MINUTES * 60_000),
    },
  });
  const link = `${env.WEB_ORIGIN}/reset-password?token=${encodeURIComponent(token)}`;
  await sendMail({
    to: user.email,
    subject: 'AVLOD — parolni tiklash',
    text: `Assalomu alaykum, ${user.displayName}!\n\nParolni tiklash uchun havola (${RESET_TTL_MINUTES} daqiqa amal qiladi):\n${link}\n\nAgar siz so‘ramagan bo‘lsangiz, bu xatni e’tiborsiz qoldiring.`,
  });
}

export async function confirmPasswordReset(token: string, password: string) {
  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashToken(token) },
  });
  if (!record || record.usedAt || record.expiresAt < new Date()) {
    throw badRequest('Havola yaroqsiz yoki muddati o‘tgan.', undefined, 'INVALID_RESET_TOKEN');
  }
  const passwordHash = await hashPassword(password);
  await prisma.$transaction(async (tx) => {
    await tx.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } });
    await tx.user.update({
      where: { id: record.userId },
      data: { passwordHash, passwordChangedAt: new Date(), failedLoginCount: 0, lockedUntil: null },
    });
    await tx.refreshSession.updateMany({
      where: { userId: record.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    await audit(tx, {
      actorId: record.userId,
      action: 'auth.password_reset',
      entityType: 'User',
      entityId: record.userId,
    });
  });
}
