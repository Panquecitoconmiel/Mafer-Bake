import type { Prisma } from "@prisma/client";
import { prisma, type Tx } from "../config/prisma.js";

export async function audit(
  entry: { userId?: string | null; action: string; entity: string; entityId?: string | null; details?: Prisma.InputJsonValue },
  tx: Tx = prisma,
) {
  await tx.auditLog.create({
    data: {
      userId: entry.userId ?? null,
      action: entry.action,
      entity: entry.entity,
      entityId: entry.entityId ?? null,
      details: entry.details,
    },
  });
}
