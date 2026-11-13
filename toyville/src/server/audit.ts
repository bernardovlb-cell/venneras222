import "server-only";
import { db, type DbOrTx } from "./db/client";
import { auditLogs } from "./db/schema";

export async function audit(
  entry: { userId?: string | null; action: string; entity: string; entityId?: string | null; data?: Record<string, unknown>; ip?: string | null },
  tx: DbOrTx = db,
) {
  await tx.insert(auditLogs).values({
    userId: entry.userId ?? null,
    action: entry.action,
    entity: entry.entity,
    entityId: entry.entityId ?? null,
    data: entry.data ?? null,
    ip: entry.ip ?? null,
  });
}
