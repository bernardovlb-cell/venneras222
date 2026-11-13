import { vi } from "vitest";
import { sql, eq } from "drizzle-orm";
import { db } from "@/server/db/client";
import * as s from "@/server/db/schema";
import { seedBase } from "@/server/seed/base";
import type { MpPayment } from "@/server/payments/mercadopago";

export async function resetDb() {
  const tables = await db.execute<{ tablename: string }>(sql`select tablename from pg_tables where schemaname = 'public' and tablename not like '\\_\\_%'`);
  const names = tables.map((t) => `"${t.tablename}"`).join(", ");
  await db.execute(sql.raw(`truncate ${names} restart identity cascade`));
  await seedBase(db);
}

let seq = 0;
export async function makeProduct(o: { stock?: number; price?: number; sale?: number | null; categorySlug?: string; status?: "active" | "draft"; name?: string; variants?: number; minAge?: number | null; maxAge?: number | null } = {}) {
  seq++;
  const cat = (await db.select().from(s.categories).where(eq(s.categories.slug, o.categorySlug ?? "pelucias")))[0];
  const [p] = await db.insert(s.products).values({
    sku: `T-${seq}`, slug: `t-${seq}`, name: o.name ?? `Produto teste ${seq}`, categoryId: cat?.id, status: o.status ?? "active",
    minAgeMonths: o.minAge ?? null, maxAgeMonths: o.maxAge ?? null,
  }).returning();
  const variantIds: string[] = [];
  for (let i = 0; i < (o.variants ?? 1); i++) {
    const [v] = await db.insert(s.productVariants).values({
      productId: p.id, sku: `T-${seq}-${i}`, name: i === 0 ? "Padrão" : `Var ${i}`, priceCents: o.price ?? 10000, salePriceCents: o.sale ?? null, stockOnHand: o.stock ?? 5,
    }).returning();
    variantIds.push(v.id);
  }
  return { productId: p.id, variantId: variantIds[0], variantIds, categoryId: cat?.id };
}

export async function makeCart(items: { variantId: string; quantity: number }[], couponCode: string | null = null) {
  const [c] = await db.insert(s.carts).values({ couponCode }).returning();
  for (const i of items) await db.insert(s.cartItems).values({ cartId: c.id, ...i });
  return c.id;
}

export async function configurePickup() {
  await db.update(s.shippingMethods).set({ isActive: true, config: { address: "Rua Teste, 100", city: "Cidade", state: "SP", hours: "Seg a sex, 9h às 18h", instructions: "", prepDays: 1 } })
    .where(eq(s.shippingMethods.code, "retirada"));
}

export async function configureLocalDelivery(priceCents = 1500) {
  await db.update(s.shippingMethods).set({ isActive: true, config: { zipRanges: [{ from: "01000000", to: "05999999" }], priceCents, minDays: 1, maxDays: 2 } })
    .where(eq(s.shippingMethods.code, "entrega-local"));
}

export const address = { recipient: "Ana Teste", zip: "01310-100", street: "Av. Paulista", number: "1000", district: "Bela Vista", city: "São Paulo", state: "SP" };

export function checkoutInput(over: Record<string, unknown> = {}) {
  return {
    idempotencyKey: crypto.randomUUID(), email: "cliente@exemplo.com", name: "Ana Teste", phone: "(11) 98888-7777",
    shippingCode: "retirada", address: null, acceptTerms: true as const, marketingConsent: false, ...over,
  };
}

/** Simula a API do Mercado Pago no nível do fetch (somente para testes). */
export function mockMercadoPago() {
  const paymentsById = new Map<string, MpPayment>();
  const calls: { method: string; path: string; body: unknown; headers: Record<string, string> }[] = [];
  const spy = vi.spyOn(globalThis, "fetch").mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);
    const method = init?.method ?? "GET";
    const body = init?.body ? JSON.parse(String(init.body)) : null;
    calls.push({ method, path: url.pathname + url.search, body, headers: (init?.headers ?? {}) as Record<string, string> });
    const json = (d: unknown, status = 200) => new Response(JSON.stringify(d), { status, headers: { "content-type": "application/json" } });
    if (url.pathname === "/checkout/preferences" && method === "POST") {
      return json({ id: `pref-${body.external_reference}`, init_point: `https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=pref-${body.external_reference}` }, 201);
    }
    const m = url.pathname.match(/^\/v1\/payments\/(\d+)$/);
    if (m && method === "GET") {
      const p = paymentsById.get(m[1]);
      return p ? json(p) : json({ message: "not found" }, 404);
    }
    if (url.pathname === "/v1/payments/search") {
      const ref = url.searchParams.get("external_reference");
      return json({ results: [...paymentsById.values()].filter((p) => p.external_reference === ref) });
    }
    const r = url.pathname.match(/^\/v1\/payments\/(\d+)\/refunds$/);
    if (r && method === "POST") {
      const p = paymentsById.get(r[1])!;
      const amount = body?.amount ?? p.transaction_amount - (p.transaction_amount_refunded ?? 0);
      p.transaction_amount_refunded = Math.round(((p.transaction_amount_refunded ?? 0) + amount) * 100) / 100;
      if (p.transaction_amount_refunded >= p.transaction_amount) p.status = "refunded";
      return json({ id: Date.now(), amount, status: "approved" }, 201);
    }
    return json({ message: "unexpected" }, 500);
  });
  return {
    spy, calls,
    setPayment(p: Partial<MpPayment> & { id: number; external_reference: string; transaction_amount: number; status: string }) {
      paymentsById.set(String(p.id), { currency_id: "BRL", payment_type_id: "bank_transfer", payment_method_id: "pix", ...p } as MpPayment);
    },
    restore() { spy.mockRestore(); },
  };
}
