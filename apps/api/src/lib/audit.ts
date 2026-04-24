import { Prisma } from '@prisma/client';
import { prisma } from './prisma.js';

function toJsonValue(value: unknown): Prisma.InputJsonValue | Prisma.NullTypes.DbNull | undefined {
  if (value === undefined) return undefined;
  if (value === null) return Prisma.DbNull;
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

export async function recordAuditLog(input: {
  userId?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  oldValue?: unknown;
  newValue?: unknown;
  ipAddress?: string | null;
}): Promise<void> {
  await prisma.auditLog.create({
    data: {
      userId: input.userId ?? null,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      oldValue: toJsonValue(input.oldValue),
      newValue: toJsonValue(input.newValue),
      ipAddress: input.ipAddress ?? null,
    },
  });
}
