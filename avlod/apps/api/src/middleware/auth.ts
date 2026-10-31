import type { NextFunction, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { unauthorized } from '../lib/errors';
import { verifyAccessToken } from '../lib/tokens';

declare module 'express-serve-static-core' {
  interface Request {
    user?: { id: string; email: string; displayName: string };
  }
}

async function resolveUser(req: Request) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return null;
  const claims = verifyAccessToken(header.slice(7));
  if (!claims) return null;
  const user = await prisma.user.findUnique({
    where: { id: claims.sub },
    select: { id: true, email: true, displayName: true, passwordChangedAt: true },
  });
  if (!user) return null;
  // Tokens minted before a password change are no longer valid.
  if (user.passwordChangedAt && Math.floor(user.passwordChangedAt.getTime() / 1000) > claims.pwd)
    return null;
  return { id: user.id, email: user.email, displayName: user.displayName };
}

export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const user = await resolveUser(req);
  if (!user) throw unauthorized();
  req.user = user;
  next();
}

export async function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const user = await resolveUser(req);
  if (user) req.user = user;
  next();
}
