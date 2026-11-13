import "server-only";
import { and, eq, gt, isNotNull, isNull, lt, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/client";
import { cartItems, carts, productVariants, products } from "../db/schema";
import { AppError } from "../errors";
import { loadSettings } from "../settings";
import { sendEmail } from "../email";
import { env } from "../env";
import { log } from "../log";

/**
 * Recuperação de carrinho abandonado (LGPD: só com consentimento explícito).
 * - O contato é gravado no carrinho quando a pessoa marca o consentimento no checkout; desmarcar apaga.
 * - Um único lembrete por carrinho, após `cartRecoveryHours`, e somente se a função estiver ativada no painel.
 * - Carrinhos com mais de 7 dias não recebem lembrete (evita mensagens tardias).
 */
export async function saveCartContact(cartId: string, email: string, consent: boolean) {
  if (!consent) {
    await db.update(carts).set({ email: null, recoveryConsent: false }).where(and(eq(carts.id, cartId), isNull(carts.convertedOrderId)));
    return;
  }
  const e = z.string().trim().toLowerCase().email().max(160).safeParse(email);
  if (!e.success) throw new AppError("email", "E-mail inválido.", 400, "email");
  await db.update(carts).set({ email: e.data, recoveryConsent: true }).where(and(eq(carts.id, cartId), isNull(carts.convertedOrderId)));
}

export async function sendCartRecoveryEmails(now = new Date()) {
  const s = await loadSettings();
  if (!s.checkout.cartRecoveryEnabled) return { enabled: false, sent: 0 };
  const olderThan = new Date(now.getTime() - s.checkout.cartRecoveryHours * 3600e3);
  const notBefore = new Date(now.getTime() - 7 * 86400e3);
  const due = await db.select({ id: carts.id, email: carts.email }).from(carts).where(and(
    eq(carts.recoveryConsent, true), isNotNull(carts.email), isNull(carts.convertedOrderId), isNull(carts.recoverySentAt),
    lt(carts.updatedAt, olderThan), gt(carts.updatedAt, notBefore),
    sql`exists (select 1 from cart_items ci where ci.cart_id = ${carts.id})`,
  )).limit(200);

  let sent = 0;
  for (const c of due) {
    // marca antes de enviar: se duas execuções coincidirem, só uma envia
    const claimed = await db.update(carts).set({ recoverySentAt: now }).where(and(eq(carts.id, c.id), isNull(carts.recoverySentAt))).returning({ id: carts.id });
    if (!claimed.length) continue;
    const items = await db.select({ name: products.name, slug: products.slug, variant: productVariants.name, qty: cartItems.quantity })
      .from(cartItems).innerJoin(productVariants, eq(productVariants.id, cartItems.variantId)).innerJoin(products, eq(products.id, productVariants.productId))
      .where(and(eq(cartItems.cartId, c.id), eq(products.status, "active")));
    if (!items.length) continue;
    const lines = items.map((i) => `- ${i.qty}x ${i.name}${i.variant !== "Padrão" ? ` (${i.variant})` : ""}: ${env.appUrl}/produto/${i.slug}`).join("\n");
    await sendEmail(c.email!, "Você deixou brinquedos no carrinho — ToyVille",
      `Olá!\n\nVocê separou estes itens na ToyVille e ainda não finalizou a compra:\n\n${lines}\n\nPreços e estoque são confirmados no momento da compra.\n\nVocê recebeu esta mensagem porque autorizou lembretes por e-mail no checkout. Não enviaremos outro lembrete sobre este carrinho. Para pedir a exclusão do seu contato, responda a este e-mail ou use ${env.appUrl}/atendimento.\n\nToyVille`);
    sent++;
  }
  log("info", "recuperação de carrinho", { due: due.length, sent });
  return { enabled: true, sent };
}
