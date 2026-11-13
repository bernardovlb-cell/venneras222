import "server-only";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/client";
import { products, reviews } from "../db/schema";
import { AppError, isUniqueViolation } from "../errors";
import { enforceRateLimit } from "../rate-limit";
import { userHasPurchased } from "./orders";

export const reviewSchema = z.object({
  productId: z.string().uuid(),
  rating: z.coerce.number().int().min(1, "Escolha de 1 a 5 estrelas").max(5),
  title: z.string().trim().max(80).optional().or(z.literal("")),
  body: z.string().trim().min(10, "Conte um pouco mais (mínimo 10 caracteres)").max(2000),
});

// Filtro básico de conteúdo impróprio/spam. Toda avaliação passa por moderação de qualquer forma.
const BLOCKLIST = [/https?:\/\//i, /www\./i, /\b(viagra|cassino|casino|bet\d*|apostas?)\b/i, /(.)\1{9,}/];

/** "Maria Souza" → "Maria S." */
export function displayName(full: string) {
  const parts = full.trim().split(/\s+/);
  return parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1][0].toUpperCase()}.` : parts[0];
}

/**
 * Regra: só clientes com conta podem avaliar; compra verificada é marcada quando há pedido pago
 * com o produto. Avaliações entram como "pendente" e só aparecem após aprovação no painel.
 */
export async function submitReview(user: { id: string; name: string }, input: z.input<typeof reviewSchema>, ip: string) {
  const d = reviewSchema.parse(input);
  await enforceRateLimit(`review:${user.id}`, 5, 3600);
  await enforceRateLimit(`review-ip:${ip}`, 10, 3600);
  const p = (await db.select({ id: products.id, status: products.status }).from(products).where(eq(products.id, d.productId)).limit(1))[0];
  if (!p || p.status !== "active") throw new AppError("not_found", "Produto não encontrado.", 404);
  const flagged = BLOCKLIST.some((re) => re.test(`${d.title ?? ""} ${d.body}`));
  const orderId = await userHasPurchased(user.id, d.productId);
  try {
    await db.insert(reviews).values({
      productId: d.productId, userId: user.id, orderId, authorName: displayName(user.name), rating: d.rating,
      title: d.title || null, body: d.body, verifiedPurchase: !!orderId, status: "pending",
      moderationNote: flagged ? "Sinalizada automaticamente (link ou termo suspeito)" : null,
    });
  } catch (e) {
    if (isUniqueViolation(e, "reviews_user_product_uq")) throw new AppError("duplicate", "Você já avaliou este produto.");
    throw e;
  }
}

export async function moderateReview(id: string, status: "approved" | "rejected", note: string | null) {
  const r = await db.update(reviews).set({ status, moderationNote: note, moderatedAt: new Date() }).where(eq(reviews.id, id)).returning({ id: reviews.id });
  if (!r.length) throw new AppError("not_found", "Avaliação não encontrada.", 404);
}

export async function pendingReviewsCount() {
  const [r] = await db.select({ n: sql<number>`count(*)::int` }).from(reviews).where(and(eq(reviews.status, "pending")));
  return r.n;
}
