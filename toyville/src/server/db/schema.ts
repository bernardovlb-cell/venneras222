/**
 * Modelo de dados da ToyVille.
 * Convenções:
 *  - Valores monetários SEMPRE em centavos (integer), moeda BRL.
 *  - Datas em timestamptz.
 *  - Pedidos guardam snapshot dos valores cobrados (não dependem do preço atual do produto).
 *  - Registros de demonstração têm is_demo = true e são removidos por `npm run db:purge-demo`.
 */
import { sql } from "drizzle-orm";
import {
  pgTable, pgEnum, uuid, text, integer, boolean, timestamp, jsonb, primaryKey,
  uniqueIndex, index, check, bigserial, serial, type AnyPgColumn,
} from "drizzle-orm/pg-core";

const ts = (name: string) => timestamp(name, { withTimezone: true });
const createdAt = () => ts("created_at").notNull().defaultNow();
const updatedAt = () => ts("updated_at").notNull().defaultNow();

/* ---------------------------------------------------------------- Enums */
export const productStatus = pgEnum("product_status", ["draft", "active", "archived"]);
export const reviewStatus = pgEnum("review_status", ["pending", "approved", "rejected"]);
export const orderStatus = pgEnum("order_status", ["pending_payment", "paid", "cancelled", "completed", "needs_attention"]);
export const paymentStatus = pgEnum("payment_status", [
  "pending", "in_process", "approved", "rejected", "cancelled", "refunded", "partially_refunded", "charged_back", "expired",
]);
export const fulfillmentStatus = pgEnum("fulfillment_status", [
  "unfulfilled", "picking", "ready_for_pickup", "shipped", "delivered", "returned", "cancelled",
]);
export const fiscalStatus = pgEnum("fiscal_status", ["disabled", "pending", "issued", "error", "cancelled"]);
export const salesChannel = pgEnum("sales_channel", ["site", "mercadolivre", "amazon", "shopee", "manual"]);
export const shippingType = pgEnum("shipping_type", ["pickup", "local_delivery", "correios", "carrier"]);
export const couponType = pgEnum("coupon_type", ["percent", "fixed", "free_shipping"]);
export const promotionKind = pgEnum("promotion_kind", ["percent_off", "fixed_off", "free_shipping"]);
export const ticketType = pgEnum("ticket_type", ["question", "exchange", "return", "withdrawal", "complaint", "data_access", "data_deletion"]);
export const ticketStatus = pgEnum("ticket_status", ["open", "in_progress", "waiting_customer", "resolved", "closed"]);
export const contentStatus = pgEnum("content_status", ["draft", "pending_review", "published"]);
export const inventoryReason = pgEnum("inventory_reason", [
  "manual_adjust", "import", "order_reserved", "order_released", "order_committed", "return_restock", "channel_sync", "initial",
]);
export const homeSectionType = pgEnum("home_section_type", [
  "hero", "categories", "best_sellers", "deals", "flash", "gift_finder", "benefits", "featured_products", "new_arrivals",
]);

/* ---------------------------------------------------------------- Usuários e acesso */
export const roles = pgTable("roles", {
  key: text("key").primaryKey(), // owner, admin, staff, customer
  name: text("name").notNull(),
  permissions: text("permissions").array().notNull().default(sql`'{}'::text[]`), // '*' = tudo
  isStaff: boolean("is_staff").notNull().default(false),
  createdAt: createdAt(),
});

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull(),
  passwordHash: text("password_hash"),
  name: text("name").notNull(),
  phone: text("phone"),
  roleKey: text("role_key").notNull().references(() => roles.key).default("customer"),
  isActive: boolean("is_active").notNull().default(true),
  marketingConsent: boolean("marketing_consent").notNull().default(false),
  marketingConsentAt: ts("marketing_consent_at"),
  acceptedTermsAt: ts("accepted_terms_at"),
  lastLoginAt: ts("last_login_at"),
  anonymizedAt: ts("anonymized_at"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (t) => [uniqueIndex("users_email_lower_uq").on(sql`lower(${t.email})`)]);

export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(), // sha256(token) — o token puro só existe no cookie
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  expiresAt: ts("expires_at").notNull(),
  ip: text("ip"),
  userAgent: text("user_agent"),
  createdAt: createdAt(),
}, (t) => [index("sessions_user_idx").on(t.userId)]);

export const passwordResetTokens = pgTable("password_reset_tokens", {
  tokenHash: text("token_hash").primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  expiresAt: ts("expires_at").notNull(),
  usedAt: ts("used_at"),
  createdAt: createdAt(),
});

export const addresses = pgTable("addresses", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  label: text("label"),
  recipient: text("recipient").notNull(),
  phone: text("phone"),
  zip: text("zip").notNull(),
  street: text("street").notNull(),
  number: text("number").notNull(),
  complement: text("complement"),
  district: text("district").notNull(),
  city: text("city").notNull(),
  state: text("state").notNull(),
  isDefault: boolean("is_default").notNull().default(false),
  createdAt: createdAt(),
}, (t) => [index("addresses_user_idx").on(t.userId)]);

/* ---------------------------------------------------------------- Catálogo */
export const categories = pgTable("categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  parentId: uuid("parent_id").references((): AnyPgColumn => categories.id, { onDelete: "restrict" }),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  description: text("description"),
  imageUrl: text("image_url"),
  position: integer("position").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  isFeatured: boolean("is_featured").notNull().default(false),
  isDemo: boolean("is_demo").notNull().default(false),
  createdAt: createdAt(),
}, (t) => [uniqueIndex("categories_slug_uq").on(t.slug), index("categories_parent_idx").on(t.parentId)]);

export const brands = pgTable("brands", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  isDemo: boolean("is_demo").notNull().default(false),
  createdAt: createdAt(),
}, (t) => [uniqueIndex("brands_slug_uq").on(t.slug)]);

export const products = pgTable("products", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull(),
  name: text("name").notNull(),
  sku: text("sku").notNull(), // código interno do produto (as variações têm SKU próprio)
  gtin: text("gtin"),
  shortDescription: text("short_description"),
  description: text("description"),
  brandId: uuid("brand_id").references(() => brands.id, { onDelete: "set null" }),
  manufacturer: text("manufacturer"),
  categoryId: uuid("category_id").references(() => categories.id, { onDelete: "set null" }),
  minAgeMonths: integer("min_age_months"),
  maxAgeMonths: integer("max_age_months"),
  status: productStatus("status").notNull().default("draft"),
  safetyInfo: text("safety_info"),
  certifications: text("certifications"), // ex.: selo INMETRO nº ...
  weightGrams: integer("weight_grams"),
  lengthCm: integer("length_cm"),
  widthCm: integer("width_cm"),
  heightCm: integer("height_cm"),
  seoTitle: text("seo_title"),
  seoDescription: text("seo_description"),
  extra: jsonb("extra").$type<Record<string, unknown>>().notNull().default({}),
  isDemo: boolean("is_demo").notNull().default(false),
  publishedAt: ts("published_at"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (t) => [
  uniqueIndex("products_slug_uq").on(t.slug),
  uniqueIndex("products_sku_uq").on(t.sku),
  index("products_category_idx").on(t.categoryId),
  index("products_status_idx").on(t.status),
  check("products_age_ck", sql`${t.minAgeMonths} is null or ${t.maxAgeMonths} is null or ${t.minAgeMonths} <= ${t.maxAgeMonths}`),
]);

export const productImages = pgTable("product_images", {
  id: uuid("id").primaryKey().defaultRandom(),
  productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  thumbUrl: text("thumb_url"),
  storageKey: text("storage_key"),
  alt: text("alt"),
  width: integer("width"),
  height: integer("height"),
  position: integer("position").notNull().default(0),
  createdAt: createdAt(),
}, (t) => [index("product_images_product_idx").on(t.productId, t.position)]);

export const productVariants = pgTable("product_variants", {
  id: uuid("id").primaryKey().defaultRandom(),
  productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  sku: text("sku").notNull(),
  name: text("name").notNull().default("Padrão"),
  options: jsonb("options").$type<Record<string, string>>().notNull().default({}), // { Cor: "Azul" }
  priceCents: integer("price_cents").notNull(),
  salePriceCents: integer("sale_price_cents"),
  saleStartsAt: ts("sale_starts_at"),
  saleEndsAt: ts("sale_ends_at"),
  stockOnHand: integer("stock_on_hand").notNull().default(0),
  stockReserved: integer("stock_reserved").notNull().default(0),
  imageId: uuid("image_id").references(() => productImages.id, { onDelete: "set null" }),
  weightGrams: integer("weight_grams"),
  isActive: boolean("is_active").notNull().default(true),
  position: integer("position").notNull().default(0),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (t) => [
  uniqueIndex("variants_sku_uq").on(t.sku),
  index("variants_product_idx").on(t.productId),
  check("variants_price_ck", sql`${t.priceCents} > 0`),
  check("variants_sale_ck", sql`${t.salePriceCents} is null or (${t.salePriceCents} > 0 and ${t.salePriceCents} < ${t.priceCents})`),
  check("variants_stock_ck", sql`${t.stockOnHand} >= 0 and ${t.stockReserved} >= 0 and ${t.stockReserved} <= ${t.stockOnHand}`),
]);

export const inventoryMovements = pgTable("inventory_movements", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  variantId: uuid("variant_id").notNull().references(() => productVariants.id, { onDelete: "cascade" }),
  deltaOnHand: integer("delta_on_hand").notNull().default(0),
  deltaReserved: integer("delta_reserved").notNull().default(0),
  reason: inventoryReason("reason").notNull(),
  channel: salesChannel("channel").notNull().default("site"),
  orderId: uuid("order_id"),
  userId: uuid("user_id"),
  note: text("note"),
  createdAt: createdAt(),
}, (t) => [index("inv_mov_variant_idx").on(t.variantId, t.createdAt)]);

/* ---------------------------------------------------------------- Carrinho / favoritos / avaliações */
export const carts = pgTable("carts", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  couponCode: text("coupon_code"),
  email: text("email"), // só preenchido com consentimento para recuperação
  recoveryConsent: boolean("recovery_consent").notNull().default(false),
  recoverySentAt: ts("recovery_sent_at"), // lembrete de carrinho abandonado já enviado (no máximo 1 por carrinho)
  convertedOrderId: uuid("converted_order_id"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (t) => [index("carts_user_idx").on(t.userId)]);

export const cartItems = pgTable("cart_items", {
  cartId: uuid("cart_id").notNull().references(() => carts.id, { onDelete: "cascade" }),
  variantId: uuid("variant_id").notNull().references(() => productVariants.id, { onDelete: "cascade" }),
  quantity: integer("quantity").notNull(),
  addedAt: createdAt(),
}, (t) => [primaryKey({ columns: [t.cartId, t.variantId] }), check("cart_qty_ck", sql`${t.quantity} between 1 and 99`)]);

export const favorites = pgTable("favorites", {
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  createdAt: createdAt(),
}, (t) => [primaryKey({ columns: [t.userId, t.productId] })]);

export const reviews = pgTable("reviews", {
  id: uuid("id").primaryKey().defaultRandom(),
  productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  orderId: uuid("order_id"),
  authorName: text("author_name").notNull(), // exibido como "Maria S."
  rating: integer("rating").notNull(),
  title: text("title"),
  body: text("body").notNull(),
  status: reviewStatus("status").notNull().default("pending"),
  verifiedPurchase: boolean("verified_purchase").notNull().default(false),
  moderationNote: text("moderation_note"),
  isDemo: boolean("is_demo").notNull().default(false),
  createdAt: createdAt(),
  moderatedAt: ts("moderated_at"),
}, (t) => [
  check("reviews_rating_ck", sql`${t.rating} between 1 and 5`),
  uniqueIndex("reviews_user_product_uq").on(t.productId, t.userId),
  index("reviews_product_status_idx").on(t.productId, t.status),
]);

/* ---------------------------------------------------------------- Entrega */
export const shippingMethods = pgTable("shipping_methods", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: text("code").notNull(),
  type: shippingType("type").notNull(),
  name: text("name").notNull(),
  isActive: boolean("is_active").notNull().default(false),
  position: integer("position").notNull().default(0),
  config: jsonb("config").$type<Record<string, unknown>>().notNull().default({}),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (t) => [uniqueIndex("shipping_methods_code_uq").on(t.code)]);

/* ---------------------------------------------------------------- Promoções */
export const coupons = pgTable("coupons", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: text("code").notNull(),
  description: text("description"),
  type: couponType("type").notNull(),
  value: integer("value").notNull().default(0), // percent: 1..100 ; fixed: centavos
  minSubtotalCents: integer("min_subtotal_cents").notNull().default(0),
  maxDiscountCents: integer("max_discount_cents"),
  startsAt: ts("starts_at"),
  endsAt: ts("ends_at"),
  usageLimit: integer("usage_limit"),
  usageLimitPerCustomer: integer("usage_limit_per_customer"),
  combinableWithPromotions: boolean("combinable_with_promotions").notNull().default(false),
  scope: jsonb("scope").$type<{ categoryIds?: string[]; productIds?: string[]; brandIds?: string[] }>().notNull().default({}),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: createdAt(),
}, (t) => [
  uniqueIndex("coupons_code_uq").on(sql`upper(${t.code})`),
  check("coupons_value_ck", sql`(${t.type} = 'percent' and ${t.value} between 1 and 100) or (${t.type} = 'fixed' and ${t.value} > 0) or (${t.type} = 'free_shipping')`),
]);

export const couponRedemptions = pgTable("coupon_redemptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  couponId: uuid("coupon_id").notNull().references(() => coupons.id, { onDelete: "cascade" }),
  orderId: uuid("order_id").notNull(),
  email: text("email").notNull(),
  userId: uuid("user_id"),
  discountCents: integer("discount_cents").notNull(),
  voided: boolean("voided").notNull().default(false), // pedido cancelado devolve o uso
  createdAt: createdAt(),
}, (t) => [uniqueIndex("coupon_redemptions_order_uq").on(t.orderId), index("coupon_redemptions_coupon_idx").on(t.couponId)]);

export const promotions = pgTable("promotions", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  kind: promotionKind("kind").notNull(),
  value: integer("value").notNull().default(0), // percent_off: 1..90 ; fixed_off: centavos por unidade
  scope: jsonb("scope").$type<{ all?: boolean; categoryIds?: string[]; productIds?: string[]; brandIds?: string[] }>().notNull().default({}),
  minSubtotalCents: integer("min_subtotal_cents").notNull().default(0), // usado em frete grátis
  startsAt: ts("starts_at"),
  endsAt: ts("ends_at"),
  isFlash: boolean("is_flash").notNull().default(false),
  badge: text("badge"),
  isActive: boolean("is_active").notNull().default(true),
  isDemo: boolean("is_demo").notNull().default(false),
  createdAt: createdAt(),
}, (t) => [
  check("promotions_value_ck", sql`(${t.kind} = 'percent_off' and ${t.value} between 1 and 90) or (${t.kind} = 'fixed_off' and ${t.value} > 0) or (${t.kind} = 'free_shipping')`),
  check("promotions_flash_ck", sql`not ${t.isFlash} or ${t.endsAt} is not null`),
]);

/* ---------------------------------------------------------------- Pedidos e pagamentos */
export const orders = pgTable("orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  number: serial("number").notNull(),
  accessTokenHash: text("access_token_hash").notNull(), // link de acompanhamento para visitantes
  idempotencyKey: text("idempotency_key"),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  channel: salesChannel("channel").notNull().default("site"),
  externalId: text("external_id"), // id do pedido no marketplace de origem
  status: orderStatus("status").notNull().default("pending_payment"),
  paymentStatus: paymentStatus("payment_status").notNull().default("pending"),
  fulfillmentStatus: fulfillmentStatus("fulfillment_status").notNull().default("unfulfilled"),
  email: text("email").notNull(),
  customerName: text("customer_name").notNull(),
  customerPhone: text("customer_phone"),
  customerDocument: text("customer_document"), // CPF (opcional; necessário para NF-e)
  subtotalCents: integer("subtotal_cents").notNull(), // após promoções de item, antes de cupom
  listSubtotalCents: integer("list_subtotal_cents").notNull(), // soma dos preços "de"
  discountCents: integer("discount_cents").notNull().default(0), // cupom
  shippingCents: integer("shipping_cents").notNull().default(0),
  totalCents: integer("total_cents").notNull(),
  couponCode: text("coupon_code"),
  pricingSnapshot: jsonb("pricing_snapshot").$type<Record<string, unknown>>().notNull().default({}),
  shippingMethodCode: text("shipping_method_code").notNull(),
  shippingMethodName: text("shipping_method_name").notNull(),
  shippingType: shippingType("shipping_type").notNull(),
  shippingAddress: jsonb("shipping_address").$type<Record<string, string> | null>(),
  shippingDetails: jsonb("shipping_details").$type<Record<string, unknown>>().notNull().default({}),
  trackingCode: text("tracking_code"),
  trackingUrl: text("tracking_url"),
  stockCommitted: boolean("stock_committed").notNull().default(false),
  stockReleased: boolean("stock_released").notNull().default(false),
  reservationExpiresAt: ts("reservation_expires_at"),
  attentionReason: text("attention_reason"),
  fiscalStatus: fiscalStatus("fiscal_status").notNull().default("disabled"),
  invoiceNumber: text("invoice_number"),
  invoiceKey: text("invoice_key"),
  invoiceUrl: text("invoice_url"),
  notes: text("notes"),
  marketingConsent: boolean("marketing_consent").notNull().default(false),
  isDemo: boolean("is_demo").notNull().default(false),
  paidAt: ts("paid_at"),
  cancelledAt: ts("cancelled_at"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (t) => [
  uniqueIndex("orders_number_uq").on(t.number),
  uniqueIndex("orders_idem_uq").on(t.idempotencyKey),
  uniqueIndex("orders_channel_external_uq").on(t.channel, t.externalId),
  index("orders_user_idx").on(t.userId),
  index("orders_status_idx").on(t.status, t.createdAt),
  index("orders_email_idx").on(sql`lower(${t.email})`),
  check("orders_money_ck", sql`${t.totalCents} >= 0 and ${t.discountCents} >= 0 and ${t.shippingCents} >= 0 and ${t.totalCents} = ${t.subtotalCents} - ${t.discountCents} + ${t.shippingCents}`),
]);

export const orderItems = pgTable("order_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  variantId: uuid("variant_id").references(() => productVariants.id, { onDelete: "set null" }),
  productId: uuid("product_id").references(() => products.id, { onDelete: "set null" }),
  sku: text("sku").notNull(),
  productName: text("product_name").notNull(),
  variantName: text("variant_name"),
  imageUrl: text("image_url"),
  quantity: integer("quantity").notNull(),
  listUnitCents: integer("list_unit_cents").notNull(), // preço normal no momento da compra
  unitCents: integer("unit_cents").notNull(), // preço unitário efetivo (após promoção de item)
  couponDiscountCents: integer("coupon_discount_cents").notNull().default(0), // rateio do cupom
  totalCents: integer("total_cents").notNull(), // unit*qty - rateio
  promotionLabel: text("promotion_label"),
}, (t) => [index("order_items_order_idx").on(t.orderId), check("order_items_qty_ck", sql`${t.quantity} > 0`)]);

export const orderEvents = pgTable("order_events", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  orderId: uuid("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  message: text("message").notNull(),
  data: jsonb("data").$type<Record<string, unknown>>(),
  userId: uuid("user_id"),
  visibleToCustomer: boolean("visible_to_customer").notNull().default(false),
  createdAt: createdAt(),
}, (t) => [index("order_events_order_idx").on(t.orderId, t.createdAt)]);

export const payments = pgTable("payments", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  provider: text("provider").notNull().default("mercadopago"),
  providerPaymentId: text("provider_payment_id"),
  preferenceId: text("preference_id"),
  status: paymentStatus("status").notNull().default("pending"),
  statusDetail: text("status_detail"),
  methodType: text("method_type"), // pix (bank_transfer), credit_card, debit_card, ticket (boleto) ...
  methodId: text("method_id"),
  amountCents: integer("amount_cents").notNull(),
  refundedCents: integer("refunded_cents").notNull().default(0),
  installments: integer("installments"),
  raw: jsonb("raw").$type<Record<string, unknown>>(),
  approvedAt: ts("approved_at"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (t) => [
  uniqueIndex("payments_provider_payment_uq").on(t.provider, t.providerPaymentId),
  index("payments_order_idx").on(t.orderId),
]);

export const webhookEvents = pgTable("webhook_events", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  provider: text("provider").notNull(),
  eventKey: text("event_key").notNull(), // x-request-id (ou tópico+id+ts)
  topic: text("topic"),
  resourceId: text("resource_id"),
  payload: jsonb("payload").$type<Record<string, unknown>>(),
  signatureValid: boolean("signature_valid").notNull(),
  processedAt: ts("processed_at"),
  error: text("error"),
  receivedAt: ts("received_at").notNull().defaultNow(),
}, (t) => [uniqueIndex("webhook_events_key_uq").on(t.provider, t.eventKey)]);

/* ---------------------------------------------------------------- Conteúdo */
export const banners = pgTable("banners", {
  id: uuid("id").primaryKey().defaultRandom(),
  placement: text("placement").notNull().default("hero"), // hero | promo
  title: text("title").notNull(),
  subtitle: text("subtitle"),
  imageUrl: text("image_url"),
  mobileImageUrl: text("mobile_image_url"),
  linkUrl: text("link_url"),
  ctaLabel: text("cta_label"),
  theme: text("theme").notNull().default("blue"), // blue | yellow | red | green | cream
  position: integer("position").notNull().default(0),
  startsAt: ts("starts_at"),
  endsAt: ts("ends_at"),
  isActive: boolean("is_active").notNull().default(true),
  isDemo: boolean("is_demo").notNull().default(false),
  createdAt: createdAt(),
});

export const homeSections = pgTable("home_sections", {
  id: uuid("id").primaryKey().defaultRandom(),
  type: homeSectionType("type").notNull(),
  title: text("title"),
  subtitle: text("subtitle"),
  position: integer("position").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  config: jsonb("config").$type<{ limit?: number; productIds?: string[]; categoryIds?: string[] }>().notNull().default({}),
  createdAt: createdAt(),
});

export const pages = pgTable("pages", {
  slug: text("slug").primaryKey(),
  title: text("title").notNull(),
  body: text("body").notNull().default(""),
  status: contentStatus("status").notNull().default("draft"),
  pendingNotes: text("pending_notes"), // o que falta o proprietário aprovar/preencher
  updatedAt: updatedAt(),
});

export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").$type<unknown>().notNull(),
  updatedAt: updatedAt(),
});

/* ---------------------------------------------------------------- Atendimento */
export const supportTickets = pgTable("support_tickets", {
  id: uuid("id").primaryKey().defaultRandom(),
  number: serial("number").notNull(),
  type: ticketType("type").notNull(),
  status: ticketStatus("status").notNull().default("open"),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  orderId: uuid("order_id").references(() => orders.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  subject: text("subject").notNull(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (t) => [index("tickets_user_idx").on(t.userId), index("tickets_status_idx").on(t.status)]);

export const ticketMessages = pgTable("ticket_messages", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  ticketId: uuid("ticket_id").notNull().references(() => supportTickets.id, { onDelete: "cascade" }),
  authorType: text("author_type").notNull(), // customer | staff
  userId: uuid("user_id"),
  body: text("body").notNull(),
  createdAt: createdAt(),
}, (t) => [index("ticket_messages_ticket_idx").on(t.ticketId)]);

/* ---------------------------------------------------------------- Operação */
export const auditLogs = pgTable("audit_logs", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  userId: uuid("user_id"),
  action: text("action").notNull(),
  entity: text("entity").notNull(),
  entityId: text("entity_id"),
  data: jsonb("data").$type<Record<string, unknown>>(),
  ip: text("ip"),
  createdAt: createdAt(),
}, (t) => [index("audit_entity_idx").on(t.entity, t.entityId), index("audit_created_idx").on(t.createdAt)]);

export const rateLimits = pgTable("rate_limits", {
  key: text("key").primaryKey(),
  count: integer("count").notNull(),
  windowStart: ts("window_start").notNull(),
});

export const emailOutbox = pgTable("email_outbox", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  to: text("to").notNull(),
  subject: text("subject").notNull(),
  text: text("text").notNull(),
  status: text("status").notNull().default("queued"), // queued | sent | failed | not_configured
  error: text("error"),
  createdAt: createdAt(),
  sentAt: ts("sent_at"),
});

/* ---------------------------------------------------------------- Integrações externas (marketplaces) */
export const externalListings = pgTable("external_listings", {
  id: uuid("id").primaryKey().defaultRandom(),
  channel: salesChannel("channel").notNull(),
  variantId: uuid("variant_id").notNull().references(() => productVariants.id, { onDelete: "cascade" }),
  externalId: text("external_id").notNull(), // ex.: MLB123..., ASIN, item_id Shopee
  externalSku: text("external_sku"),
  syncStock: boolean("sync_stock").notNull().default(true),
  status: text("status").notNull().default("linked"), // linked | error | paused
  lastSyncedAt: ts("last_synced_at"),
  lastError: text("last_error"),
  createdAt: createdAt(),
}, (t) => [uniqueIndex("ext_listing_uq").on(t.channel, t.externalId), index("ext_listing_variant_idx").on(t.variantId)]);

export const integrationLogs = pgTable("integration_logs", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  integration: text("integration").notNull(), // mercadolivre | amazon | shopee | fiscal | shipping | email
  direction: text("direction").notNull(), // outbound | inbound
  status: text("status").notNull(), // ok | error | skipped
  message: text("message").notNull(),
  data: jsonb("data").$type<Record<string, unknown>>(),
  createdAt: createdAt(),
}, (t) => [index("integration_logs_idx").on(t.integration, t.createdAt)]);
