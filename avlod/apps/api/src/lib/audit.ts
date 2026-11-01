import { Prisma } from '../generated/prisma/client';
import type { Tx } from './prisma';

export interface AuditInput {
  familyId?: string | null;
  actorId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  before?: unknown;
  after?: unknown;
  ip?: string | null;
}

const json = (v: unknown) =>
  v === undefined || v === null
    ? Prisma.JsonNull
    : (JSON.parse(JSON.stringify(v)) as Prisma.InputJsonValue);

export function audit(tx: Tx, e: AuditInput) {
  return tx.auditLog.create({
    data: {
      familyId: e.familyId ?? null,
      actorId: e.actorId ?? null,
      action: e.action,
      entityType: e.entityType,
      entityId: e.entityId ?? null,
      before: json(e.before),
      after: json(e.after),
      ip: e.ip ?? null,
    },
  });
}
