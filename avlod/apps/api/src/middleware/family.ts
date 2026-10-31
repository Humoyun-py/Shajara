import type { NextFunction, Request, Response } from 'express';
import { hasRole, type FamilyRole } from '@avlod/shared';
import { prisma } from '../lib/prisma';
import { forbidden, notFound, unauthorized } from '../lib/errors';
import { param } from '../lib/http';

declare module 'express-serve-static-core' {
  interface Request {
    family?: { id: string; role: FamilyRole };
  }
}

/**
 * Loads the caller's membership for `:familyId` and enforces a minimum role.
 * Non-members get 404 (the workspace's existence is not revealed).
 * Every handler behind this middleware must scope its queries by `req.family.id`.
 */
export function familyAccess(minimum: FamilyRole) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) throw unauthorized();
    const familyId = param(req, 'familyId');
    const membership = await prisma.familyMembership.findFirst({
      where: { familyId, userId: req.user.id, family: { deletedAt: null } },
      select: { role: true },
    });
    if (!membership) throw notFound('Oila');
    if (!hasRole(membership.role, minimum)) throw forbidden();
    req.family = { id: familyId, role: membership.role };
    next();
  };
}

export function currentFamily(req: Request) {
  if (!req.family) throw unauthorized();
  return req.family;
}

export function currentUser(req: Request) {
  if (!req.user) throw unauthorized();
  return req.user;
}
