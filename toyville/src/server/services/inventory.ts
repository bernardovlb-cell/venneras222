import "server-only";
import { asc, eq, inArray, sql } from "drizzle-orm";
import { type DbOrTx } from "../db/client";
import { inventoryMovements, productVariants } from "../db/schema";
import { AppError } from "../errors";

type Reason = (typeof inventoryMovements.$inferInsert)["reason"];
type Channel = (typeof inventoryMovements.$inferInsert)["channel"];

/** Bloqueia variações em ordem determinística (evita deadlock entre pedidos simultâneos). */
export async function lockVariants(tx: DbOrTx, ids: string[]) {
  if (!ids.length) return [];
  return tx.select().from(productVariants).where(inArray(productVariants.id, ids)).orderBy(asc(productVariants.id)).for("update");
}

export async function moveStock(
  tx: DbOrTx,
  m: { variantId: string; deltaOnHand?: number; deltaReserved?: number; reason: Reason; orderId?: string | null; userId?: string | null; note?: string | null; channel?: Channel },
) {
  const dOn = m.deltaOnHand ?? 0, dRes = m.deltaReserved ?? 0;
  if (!dOn && !dRes) return;
  const updated = await tx.update(productVariants)
    .set({ stockOnHand: sql`${productVariants.stockOnHand} + ${dOn}`, stockReserved: sql`${productVariants.stockReserved} + ${dRes}`, updatedAt: new Date() })
    .where(eq(productVariants.id, m.variantId))
    .returning({ id: productVariants.id });
  if (!updated.length) throw new AppError("variant_not_found", "Variação não encontrada.");
  await tx.insert(inventoryMovements).values({
    variantId: m.variantId, deltaOnHand: dOn, deltaReserved: dRes, reason: m.reason, orderId: m.orderId ?? null,
    userId: m.userId ?? null, note: m.note ?? null, channel: m.channel ?? "site",
  });
}

/** Ajuste manual: define o estoque físico para um valor absoluto (não pode ficar abaixo do reservado). */
export async function setStockOnHand(tx: DbOrTx, variantId: string, newOnHand: number, userId: string | null, note: string | null, reason: Reason = "manual_adjust") {
  if (!Number.isInteger(newOnHand) || newOnHand < 0) throw new AppError("invalid_stock", "Estoque deve ser um número inteiro maior ou igual a zero.");
  const [v] = await lockVariants(tx, [variantId]);
  if (!v) throw new AppError("variant_not_found", "Variação não encontrada.");
  if (newOnHand < v.stockReserved) {
    throw new AppError("below_reserved", `Há ${v.stockReserved} unidade(s) reservada(s) em pedidos aguardando pagamento. O estoque não pode ficar abaixo disso.`);
  }
  await moveStock(tx, { variantId, deltaOnHand: newOnHand - v.stockOnHand, reason, userId, note });
}
