import "server-only";
import { and, desc, eq, gte, ilike, inArray, or, sql, type SQL } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/client";
import {
  banners, coupons, emailOutbox, externalListings, homeSections, integrationLogs, orderItems, orders, pages, productVariants, products,
  promotions, reviews, roles, shippingMethods, supportTickets, users, webhookEvents,
} from "../db/schema";
import { AppError, isUniqueViolation } from "../errors";
import { audit } from "../audit";
import { hashPassword, passwordProblem } from "../auth/password";
import { destroyAllSessions } from "../auth/session";
import { PERMISSIONS } from "../auth/permissions";
import { localDeliveryConfigSchema, pickupConfigSchema, carrierConfigSchema } from "../shipping";
import { parseBRLToCents } from "@/lib/money";
import { loadSettings } from "../settings";
import { env, mercadoPagoMode } from "../env";

const optText = (max: number) => z.preprocess((v) => (typeof v === "string" && v.trim() === "" ? null : v), z.string().trim().max(max).nullish());
function localDate(s: unknown): Date | null {
  if (typeof s !== "string" || !s) return null;
  const d = new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(s) ? s : `${s}:00-03:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/* ===================================================================== DASHBOARD */
export async function dashboard() {
  const since = new Date(Date.now() - 30 * 86400e3);
  const paidStatuses = ["paid", "completed"] as const;
  const [[rev], [pend], [toShip], [canc], [refunds], top, lowStock, attention, recent, [revCount], [ticketsOpen]] = await Promise.all([
    db.select({ total: sql<number>`coalesce(sum(${orders.totalCents}),0)::int`, n: sql<number>`count(*)::int` }).from(orders).where(and(inArray(orders.status, [...paidStatuses]), gte(orders.paidAt, since), eq(orders.isDemo, false))),
    db.select({ n: sql<number>`count(*)::int`, total: sql<number>`coalesce(sum(${orders.totalCents}),0)::int` }).from(orders).where(eq(orders.status, "pending_payment")),
    db.select({ n: sql<number>`count(*)::int` }).from(orders).where(and(eq(orders.status, "paid"), inArray(orders.fulfillmentStatus, ["unfulfilled", "picking", "ready_for_pickup"]))),
    db.select({ n: sql<number>`count(*)::int` }).from(orders).where(and(eq(orders.status, "cancelled"), gte(orders.cancelledAt, since))),
    db.execute<{ total: number }>(sql`select coalesce(sum(p.refunded_cents),0)::int as total from payments p where p.refunded_cents > 0 and p.updated_at >= ${since.toISOString()}::timestamptz`),
    db.select({ name: orderItems.productName, qty: sql<number>`sum(${orderItems.quantity})::int`, total: sql<number>`sum(${orderItems.totalCents})::int` })
      .from(orderItems).innerJoin(orders, eq(orders.id, orderItems.orderId)).where(and(inArray(orders.status, [...paidStatuses]), gte(orders.paidAt, since)))
      .groupBy(orderItems.productName).orderBy(desc(sql`sum(${orderItems.quantity})`)).limit(5),
    db.select({ id: products.id, name: products.name, variant: productVariants.name, sku: productVariants.sku, available: sql<number>`(${productVariants.stockOnHand} - ${productVariants.stockReserved})::int` })
      .from(productVariants).innerJoin(products, eq(products.id, productVariants.productId))
      .where(and(eq(products.status, "active"), eq(productVariants.isActive, true), sql`${productVariants.stockOnHand} - ${productVariants.stockReserved} <= 3`))
      .orderBy(sql`${productVariants.stockOnHand} - ${productVariants.stockReserved}`).limit(10),
    db.select({ id: orders.id, number: orders.number, reason: orders.attentionReason }).from(orders).where(sql`${orders.attentionReason} is not null`).orderBy(desc(orders.updatedAt)).limit(10),
    db.select({ id: orders.id, number: orders.number, name: orders.customerName, total: orders.totalCents, status: orders.status, fulfillment: orders.fulfillmentStatus, createdAt: orders.createdAt })
      .from(orders).orderBy(desc(orders.createdAt)).limit(8),
    db.select({ n: sql<number>`count(*)::int` }).from(reviews).where(eq(reviews.status, "pending")),
    db.select({ n: sql<number>`count(*)::int` }).from(supportTickets).where(inArray(supportTickets.status, ["open", "in_progress"])),
  ]);
  return {
    revenue30: rev.total, paidOrders30: rev.n, avgTicket: rev.n ? Math.round(rev.total / rev.n) : 0,
    pendingPayment: pend.n, pendingPaymentValue: pend.total, toFulfill: toShip.n, cancelled30: canc.n, refunded30: Number(refunds.total),
    top, lowStock, attention, recent, pendingReviews: revCount.n, openTickets: ticketsOpen.n,
  };
}

/** Checklist honesto do que falta para operar. */
export async function launchChecklist() {
  const s = await loadSettings();
  const methods = await db.select().from(shippingMethods);
  const pagesPending = await db.select({ slug: pages.slug, title: pages.title }).from(pages).where(sql`${pages.status} <> 'published'`);
  const [demo] = await db.select({ n: sql<number>`count(*)::int` }).from(products).where(eq(products.isDemo, true));
  const [real] = await db.select({ n: sql<number>`count(*)::int` }).from(products).where(and(eq(products.isDemo, false), eq(products.status, "active")));
  const mode = mercadoPagoMode();
  return [
    { ok: mode === "production", label: "Mercado Pago em produção", detail: mode === "not_configured" ? "MP_ACCESS_TOKEN não configurado" : mode === "test" ? "Usando credenciais de TESTE" : mode === "unknown" ? "Defina MP_ENVIRONMENT=test ou production" : "Credenciais de produção ativas" },
    { ok: !!env.mpWebhookSecret, label: "Chave secreta do webhook", detail: env.mpWebhookSecret ? "Configurada" : "MP_WEBHOOK_SECRET ausente — notificações serão recusadas" },
    { ok: env.appUrl.startsWith("https://"), label: "URL pública HTTPS", detail: env.appUrl },
    { ok: methods.some((m) => m.isActive), label: "Entrega/retirada configurada", detail: methods.filter((m) => m.isActive).map((m) => m.name).join(", ") || "Nenhuma modalidade ativa" },
    { ok: pagesPending.length === 0, label: "Políticas aprovadas e publicadas", detail: pagesPending.length ? `Pendentes: ${pagesPending.map((p) => p.title).join(", ")}` : "OK" },
    { ok: demo.n === 0, label: "Dados de demonstração removidos", detail: demo.n ? `${demo.n} produto(s) [DEMO] — npm run db:purge-demo` : "OK" },
    { ok: real.n > 0, label: "Catálogo real publicado", detail: `${real.n} produto(s) ativos` },
    { ok: !!(s.store.legalName && s.store.cnpj && s.store.email), label: "Dados da empresa (razão social, CNPJ, e-mail)", detail: "Configurações > Loja" },
    { ok: !!env.cronSecret, label: "Tarefa agendada de expiração de pedidos", detail: env.cronSecret ? "CRON_SECRET definido (agende /api/cron/expire-orders)" : "CRON_SECRET ausente" },
    { ok: env.emailProvider === "resend" && !!process.env.RESEND_API_KEY, label: "Envio de e-mails", detail: env.emailProvider === "resend" ? "Resend" : "Somente caixa de saída (não envia)" },
    { ok: env.storageDriver === "supabase" || !env.isProd, label: "Armazenamento de imagens persistente", detail: env.storageDriver === "local" ? "Local (não serve para hospedagem serverless)" : "Supabase Storage" },
  ];
}

/* ===================================================================== PEDIDOS */
export async function listOrders(f: { q?: string; status?: string; payment?: string; fulfillment?: string; page?: number }) {
  const conds: SQL[] = [];
  if (f.status) conds.push(sql`${orders.status} = ${f.status}`);
  if (f.payment) conds.push(sql`${orders.paymentStatus} = ${f.payment}`);
  if (f.fulfillment) conds.push(sql`${orders.fulfillmentStatus} = ${f.fulfillment}`);
  if (f.status === "attention") { conds.pop(); conds.push(sql`${orders.attentionReason} is not null`); }
  if (f.q) {
    const n = Number(f.q.replace(/\D/g, ""));
    const like = `%${f.q.trim()}%`;
    conds.push(or(ilike(orders.email, like), ilike(orders.customerName, like), n ? eq(orders.number, n) : sql`false`)!);
  }
  const page = Math.max(1, f.page ?? 1);
  const where = conds.length ? and(...conds) : undefined;
  const [rows, [{ n }]] = await Promise.all([
    db.select().from(orders).where(where).orderBy(desc(orders.createdAt)).limit(50).offset((page - 1) * 50),
    db.select({ n: sql<number>`count(*)::int` }).from(orders).where(where),
  ]);
  return { rows, total: n, page, pages: Math.max(1, Math.ceil(n / 50)) };
}

export async function updateOrderAdminFields(orderId: string, input: { notes?: string; fiscalStatus?: string; invoiceNumber?: string; invoiceKey?: string; invoiceUrl?: string; clearAttention?: boolean }, userId: string) {
  const fiscal = z.enum(["disabled", "pending", "issued", "error", "cancelled"]).optional().parse(input.fiscalStatus || undefined);
  if (input.invoiceUrl && !/^https:\/\//.test(input.invoiceUrl)) throw new AppError("url", "URL da nota deve começar com https://", 400, "invoiceUrl");
  if (input.invoiceKey && !/^\d{44}$/.test(input.invoiceKey.replace(/\s/g, ""))) throw new AppError("key", "Chave de acesso deve ter 44 dígitos", 400, "invoiceKey");
  await db.update(orders).set({
    notes: input.notes?.slice(0, 2000) ?? undefined, fiscalStatus: fiscal, invoiceNumber: input.invoiceNumber?.slice(0, 40) || null,
    invoiceKey: input.invoiceKey?.replace(/\s/g, "") || null, invoiceUrl: input.invoiceUrl || null,
    ...(input.clearAttention ? { attentionReason: null } : {}), updatedAt: new Date(),
  }).where(eq(orders.id, orderId));
  if (input.clearAttention) {
    const o = (await db.select({ status: orders.status, paidAt: orders.paidAt }).from(orders).where(eq(orders.id, orderId)))[0];
    if (o?.status === "needs_attention") await db.update(orders).set({ status: o.paidAt ? "paid" : "pending_payment" }).where(eq(orders.id, orderId));
  }
  await audit({ userId, action: "order.admin_update", entity: "order", entityId: orderId, data: { fiscal, clearAttention: input.clearAttention } });
}

/* ===================================================================== CLIENTES */
export async function listCustomers(q?: string, page = 1) {
  const conds: SQL[] = [eq(users.roleKey, "customer"), sql`${users.anonymizedAt} is null`];
  if (q) conds.push(or(ilike(users.email, `%${q}%`), ilike(users.name, `%${q}%`))!);
  return db.select({
    id: users.id, name: users.name, email: users.email, phone: users.phone, createdAt: users.createdAt,
    orders: sql<number>`(select count(*)::int from orders o where o.user_id = ${users.id})`,
    spent: sql<number>`(select coalesce(sum(o.total_cents),0)::int from orders o where o.user_id = ${users.id} and o.status in ('paid','completed'))`,
  }).from(users).where(and(...conds)).orderBy(desc(users.createdAt)).limit(50).offset((page - 1) * 50);
}

/* ===================================================================== CUPONS E PROMOÇÕES */
const ids = z.preprocess((v) => (Array.isArray(v) ? v : v ? [v] : []), z.array(z.string().uuid()));

export const couponSchema = z.object({
  code: z.string().trim().toUpperCase().regex(/^[A-Z0-9_-]{3,40}$/, "Use 3 a 40 letras, números, - ou _"),
  description: optText(200),
  type: z.enum(["percent", "fixed", "free_shipping"]),
  value: z.string().optional(),
  minSubtotal: z.string().optional(),
  maxDiscount: z.string().optional(),
  startsAt: z.string().optional(),
  endsAt: z.string().optional(),
  usageLimit: z.preprocess((v) => (v === "" || v == null ? null : Number(v)), z.number().int().min(1).nullable()),
  usageLimitPerCustomer: z.preprocess((v) => (v === "" || v == null ? null : Number(v)), z.number().int().min(1).nullable()),
  combinableWithPromotions: z.boolean(),
  isActive: z.boolean(),
  categoryIds: ids, productIds: ids, brandIds: ids,
});

export async function saveCoupon(input: unknown, userId: string, id?: string) {
  const d = couponSchema.parse(input);
  let value = 0;
  if (d.type === "percent") { value = Number(d.value); if (!Number.isInteger(value) || value < 1 || value > 100) throw new AppError("value", "Percentual entre 1 e 100", 400, "value"); }
  if (d.type === "fixed") { value = parseBRLToCents(d.value ?? "") ?? 0; if (value <= 0) throw new AppError("value", "Valor do desconto inválido", 400, "value"); }
  const startsAt = localDate(d.startsAt), endsAt = localDate(d.endsAt);
  if (startsAt && endsAt && endsAt <= startsAt) throw new AppError("dates", "Fim antes do início", 400, "endsAt");
  const values = {
    code: d.code, description: d.description, type: d.type, value, minSubtotalCents: parseBRLToCents(d.minSubtotal ?? "") ?? 0,
    maxDiscountCents: d.maxDiscount ? parseBRLToCents(d.maxDiscount) : null, startsAt, endsAt, usageLimit: d.usageLimit,
    usageLimitPerCustomer: d.usageLimitPerCustomer, combinableWithPromotions: d.combinableWithPromotions, isActive: d.isActive,
    scope: { categoryIds: d.categoryIds, productIds: d.productIds, brandIds: d.brandIds },
  };
  try {
    if (id) await db.update(coupons).set(values).where(eq(coupons.id, id));
    else await db.insert(coupons).values(values);
  } catch (e) {
    if (isUniqueViolation(e, "coupons_code_uq")) throw new AppError("dup", "Já existe um cupom com este código.", 400, "code");
    throw e;
  }
  await audit({ userId, action: id ? "coupon.update" : "coupon.create", entity: "coupon", entityId: id ?? d.code, data: values });
}

export const promotionSchema = z.object({
  name: z.string().trim().min(2).max(100),
  kind: z.enum(["percent_off", "fixed_off", "free_shipping"]),
  value: z.string().optional(),
  minSubtotal: z.string().optional(),
  startsAt: z.string().optional(),
  endsAt: z.string().optional(),
  isFlash: z.boolean(),
  badge: optText(30),
  isActive: z.boolean(),
  all: z.boolean(),
  categoryIds: ids, productIds: ids, brandIds: ids,
});

export async function savePromotion(input: unknown, userId: string, id?: string) {
  const d = promotionSchema.parse(input);
  let value = 0;
  if (d.kind === "percent_off") { value = Number(d.value); if (!Number.isInteger(value) || value < 1 || value > 90) throw new AppError("value", "Percentual entre 1 e 90", 400, "value"); }
  if (d.kind === "fixed_off") { value = parseBRLToCents(d.value ?? "") ?? 0; if (value <= 0) throw new AppError("value", "Valor inválido", 400, "value"); }
  const startsAt = localDate(d.startsAt), endsAt = localDate(d.endsAt);
  if (d.isFlash && !endsAt) throw new AppError("endsAt", "Oferta relâmpago precisa de data de término", 400, "endsAt");
  if (startsAt && endsAt && endsAt <= startsAt) throw new AppError("dates", "Fim antes do início", 400, "endsAt");
  if (d.kind !== "free_shipping" && !d.all && !d.categoryIds.length && !d.productIds.length && !d.brandIds.length) {
    throw new AppError("scope", "Escolha onde a promoção vale (toda a loja, categorias, marcas ou produtos).", 400, "all");
  }
  const values = {
    name: d.name, kind: d.kind, value, minSubtotalCents: parseBRLToCents(d.minSubtotal ?? "") ?? 0, startsAt, endsAt, isFlash: d.isFlash,
    badge: d.badge, isActive: d.isActive, scope: { all: d.all, categoryIds: d.categoryIds, productIds: d.productIds, brandIds: d.brandIds },
  };
  if (id) await db.update(promotions).set(values).where(eq(promotions.id, id));
  else await db.insert(promotions).values(values);
  await audit({ userId, action: id ? "promotion.update" : "promotion.create", entity: "promotion", entityId: id ?? d.name, data: values });
}

/* ===================================================================== CONTEÚDO */
export const bannerSchema = z.object({
  placement: z.enum(["hero", "promo"]), title: z.string().trim().min(2).max(120), subtitle: optText(200),
  linkUrl: z.preprocess((v) => (v === "" ? null : v), z.string().regex(/^(\/[^\s]*|https:\/\/[^\s]+)$/, "Use um caminho do site (/ofertas) ou https://").nullable()),
  ctaLabel: optText(40), theme: z.enum(["blue", "yellow", "red", "green", "cream"]), position: z.coerce.number().int().min(0).max(999),
  startsAt: z.string().optional(), endsAt: z.string().optional(), isActive: z.boolean(),
});

export async function saveBanner(input: unknown, images: { imageUrl?: string | null; mobileImageUrl?: string | null }, userId: string, id?: string) {
  const d = bannerSchema.parse(input);
  const values = { ...d, startsAt: localDate(d.startsAt), endsAt: localDate(d.endsAt), ...images };
  if (id) await db.update(banners).set(values).where(eq(banners.id, id));
  else await db.insert(banners).values(values);
  await audit({ userId, action: id ? "banner.update" : "banner.create", entity: "banner", entityId: id ?? d.title });
}

export async function saveHomeSection(id: string, input: { title?: string; subtitle?: string; position?: number; isActive?: boolean; limit?: number; productIds?: string[] }, userId: string) {
  const current = (await db.select().from(homeSections).where(eq(homeSections.id, id)))[0];
  if (!current) throw new AppError("not_found", "Seção não encontrada", 404);
  await db.update(homeSections).set({
    title: input.title?.slice(0, 80) || null, subtitle: input.subtitle?.slice(0, 160) || null,
    position: Math.max(0, Math.min(99, input.position ?? current.position)), isActive: input.isActive ?? current.isActive,
    config: { ...current.config, limit: input.limit ? Math.max(1, Math.min(16, input.limit)) : current.config.limit, ...(input.productIds ? { productIds: input.productIds } : {}) },
  }).where(eq(homeSections.id, id));
  await audit({ userId, action: "home_section.update", entity: "home_section", entityId: id });
}

export async function savePage(slug: string, input: { title: string; body: string; status: string; pendingNotes?: string }, userId: string, create = false) {
  const status = z.enum(["draft", "pending_review", "published"]).parse(input.status);
  if (!/^[a-z0-9-]{2,80}$/.test(slug)) throw new AppError("slug", "Endereço inválido (use letras minúsculas, números e hífen)", 400, "slug");
  const title = input.title.trim().slice(0, 120);
  if (!title) throw new AppError("title", "Informe o título", 400, "title");
  if (status === "published" && /\[PENDENTE/.test(input.body)) throw new AppError("pending", "O texto ainda tem trechos [PENDENTE]. Complete-os antes de publicar.", 400, "body");
  const values = { title, body: input.body.slice(0, 50000), status, pendingNotes: input.pendingNotes?.slice(0, 1000) || null, updatedAt: new Date() };
  if (create) {
    try { await db.insert(pages).values({ slug, ...values }); } catch (e) { if (isUniqueViolation(e)) throw new AppError("dup", "Já existe uma página com este endereço.", 400, "slug"); throw e; }
  } else await db.update(pages).set(values).where(eq(pages.slug, slug));
  await audit({ userId, action: "page.save", entity: "page", entityId: slug, data: { status } });
}

/* ===================================================================== ENTREGA */
export async function saveShippingMethod(id: string, input: { name: string; isActive: boolean; config: unknown }, userId: string) {
  const m = (await db.select().from(shippingMethods).where(eq(shippingMethods.id, id)))[0];
  if (!m) throw new AppError("not_found", "Modalidade não encontrada", 404);
  const schema = m.type === "pickup" ? pickupConfigSchema : m.type === "local_delivery" ? localDeliveryConfigSchema : carrierConfigSchema;
  const config = schema.parse(input.config) as Record<string, unknown>;
  if (input.isActive) {
    if (m.type === "pickup" && !(config.address && config.city && config.hours)) throw new AppError("incomplete", "Preencha endereço, cidade e horários para ativar a retirada.");
    if (m.type === "local_delivery" && (!(config.zipRanges as unknown[]).length || config.priceCents == null)) throw new AppError("incomplete", "Informe as faixas de CEP e o valor para ativar a entrega local.");
    if (m.type === "correios" || m.type === "carrier") throw new AppError("not_implemented", "Esta modalidade depende de uma integração ainda não implementada (veja docs/INTEGRACOES.md).");
  }
  await db.update(shippingMethods).set({ name: input.name.trim().slice(0, 60) || m.name, isActive: input.isActive, config, updatedAt: new Date() }).where(eq(shippingMethods.id, id));
  await audit({ userId, action: "shipping.update", entity: "shipping_method", entityId: id, data: { isActive: input.isActive } });
}

/* ===================================================================== USUÁRIOS E PERMISSÕES */
export async function listStaff() {
  return db.select({ id: users.id, name: users.name, email: users.email, roleKey: users.roleKey, isActive: users.isActive, lastLoginAt: users.lastLoginAt })
    .from(users).innerJoin(roles, eq(roles.key, users.roleKey)).where(eq(roles.isStaff, true)).orderBy(users.name);
}

export async function createStaff(input: { name: string; email: string; password: string; roleKey: string }, actor: { id: string; roleKey: string }) {
  const email = z.string().trim().toLowerCase().email().parse(input.email);
  const p = passwordProblem(input.password);
  if (p) throw new AppError("weak", p, 400, "password");
  const role = (await db.select().from(roles).where(eq(roles.key, input.roleKey)))[0];
  if (!role || !role.isStaff) throw new AppError("role", "Papel inválido", 400, "roleKey");
  if (role.key === "owner" && actor.roleKey !== "owner") throw new AppError("forbidden", "Somente o proprietário pode criar outro proprietário.", 403);
  try {
    const [u] = await db.insert(users).values({ name: input.name.trim().slice(0, 120) || email, email, passwordHash: await hashPassword(input.password), roleKey: role.key, acceptedTermsAt: new Date() }).returning({ id: users.id });
    await audit({ userId: actor.id, action: "staff.create", entity: "user", entityId: u.id, data: { email, role: role.key } });
  } catch (e) {
    if (isUniqueViolation(e, "users_email_lower_uq")) throw new AppError("dup", "Já existe um usuário com este e-mail. (Clientes não podem ser promovidos por aqui por segurança.)", 400, "email");
    throw e;
  }
}

export async function updateStaff(userId: string, input: { roleKey: string; isActive: boolean }, actor: { id: string; roleKey: string }) {
  if (userId === actor.id) throw new AppError("self", "Você não pode alterar o próprio papel ou desativar a si mesmo.");
  const target = (await db.select().from(users).where(eq(users.id, userId)))[0];
  if (!target) throw new AppError("not_found", "Usuário não encontrado", 404);
  const role = (await db.select().from(roles).where(eq(roles.key, input.roleKey)))[0];
  if (!role?.isStaff) throw new AppError("role", "Papel inválido");
  if ((target.roleKey === "owner" || role.key === "owner") && actor.roleKey !== "owner") throw new AppError("forbidden", "Somente o proprietário pode alterar proprietários.", 403);
  if (target.roleKey === "owner" && (role.key !== "owner" || !input.isActive)) {
    const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(users).where(and(eq(users.roleKey, "owner"), eq(users.isActive, true)));
    if (n <= 1) throw new AppError("last_owner", "Deve existir ao menos um proprietário ativo.");
  }
  await db.update(users).set({ roleKey: role.key, isActive: input.isActive, updatedAt: new Date() }).where(eq(users.id, userId));
  if (!input.isActive || role.key !== target.roleKey) await destroyAllSessions(userId);
  await audit({ userId: actor.id, action: "staff.update", entity: "user", entityId: userId, data: input });
}

export async function updateRolePermissions(key: string, perms: string[], actorId: string) {
  if (key === "owner" || key === "customer") throw new AppError("locked", "Este papel não pode ser alterado.");
  const valid = perms.filter((p) => p in PERMISSIONS);
  await db.update(roles).set({ permissions: valid }).where(and(eq(roles.key, key), eq(roles.isStaff, true)));
  await audit({ userId: actorId, action: "role.update", entity: "role", entityId: key, data: { permissions: valid } });
}

/* ===================================================================== INTEGRAÇÕES */
export async function saveExternalListing(input: { channel: string; sku: string; externalId: string; externalSku?: string }, userId: string) {
  const channel = z.enum(["mercadolivre", "amazon", "shopee"]).parse(input.channel);
  const v = (await db.select({ id: productVariants.id }).from(productVariants).where(sql`upper(${productVariants.sku}) = upper(${input.sku.trim()})`))[0];
  if (!v) throw new AppError("sku", "SKU interno não encontrado.", 400, "sku");
  const ext = input.externalId.trim();
  if (!/^[A-Za-z0-9._-]{3,60}$/.test(ext)) throw new AppError("ext", "Identificador externo inválido.", 400, "externalId");
  try {
    await db.insert(externalListings).values({ channel, variantId: v.id, externalId: ext, externalSku: input.externalSku?.trim() || null });
  } catch (e) {
    if (isUniqueViolation(e, "ext_listing_uq")) throw new AppError("dup", "Este anúncio já está vinculado.", 400, "externalId");
    throw e;
  }
  await audit({ userId, action: "listing.link", entity: "external_listing", entityId: ext, data: { channel, sku: input.sku } });
}

export async function integrationOverview() {
  const [listings, logs, outbox, hooks] = await Promise.all([
    db.select({ id: externalListings.id, channel: externalListings.channel, externalId: externalListings.externalId, sku: productVariants.sku, status: externalListings.status, lastSyncedAt: externalListings.lastSyncedAt, lastError: externalListings.lastError })
      .from(externalListings).innerJoin(productVariants, eq(productVariants.id, externalListings.variantId)).orderBy(desc(externalListings.createdAt)).limit(100),
    db.select().from(integrationLogs).orderBy(desc(integrationLogs.createdAt)).limit(30),
    db.select().from(emailOutbox).orderBy(desc(emailOutbox.createdAt)).limit(30),
    db.select().from(webhookEvents).orderBy(desc(webhookEvents.receivedAt)).limit(30),
  ]);
  return { listings, logs, outbox, hooks };
}
