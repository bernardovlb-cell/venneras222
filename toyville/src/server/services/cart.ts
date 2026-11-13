import "server-only";
import { cookies } from "next/headers";
import { and, eq, inArray, sql } from "drizzle-orm";
import { db, type DbOrTx } from "../db/client";
import { cartItems, carts, productImages, productVariants, products } from "../db/schema";
import { AppError } from "../errors";
import { env } from "../env";
import { categoryLineage, couponUsage, findCoupon, loadActivePromotions, loadCategories } from "./promotions";
import { priceCart, type PricingLineInput, type PricingResult } from "@/lib/pricing";

export const CART_COOKIE = "tv_cart";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function readCartId(): Promise<string | null> {
  const jar = await cookies();
  const v = jar.get(CART_COOKIE)?.value;
  return v && UUID_RE.test(v) ? v : null;
}

async function ensureCart(userId: string | null): Promise<string> {
  const existing = await readCartId();
  if (existing) {
    const c = (await db.select({ id: carts.id, convertedOrderId: carts.convertedOrderId }).from(carts).where(eq(carts.id, existing)).limit(1))[0];
    if (c && !c.convertedOrderId) return c.id;
  }
  const [c] = await db.insert(carts).values({ userId }).returning({ id: carts.id });
  const jar = await cookies();
  jar.set(CART_COOKIE, c.id, { httpOnly: true, sameSite: "lax", secure: env.isProd, path: "/", maxAge: 60 * 60 * 24 * 60 });
  return c.id;
}

export async function addToCart(variantId: string, quantity: number, userId: string | null) {
  if (!UUID_RE.test(variantId)) throw new AppError("invalid_variant", "Produto inválido.");
  const qty = Math.floor(quantity);
  if (!(qty >= 1 && qty <= 99)) throw new AppError("invalid_qty", "Quantidade inválida.");
  const v = (await db.select({ id: productVariants.id, active: productVariants.isActive, onHand: productVariants.stockOnHand, reserved: productVariants.stockReserved, status: products.status })
    .from(productVariants).innerJoin(products, eq(products.id, productVariants.productId)).where(eq(productVariants.id, variantId)).limit(1))[0];
  if (!v || !v.active || v.status !== "active") throw new AppError("unavailable", "Este produto não está disponível.");
  const available = v.onHand - v.reserved;
  if (available <= 0) throw new AppError("out_of_stock", "Produto esgotado no momento.");
  const cartId = await ensureCart(userId);
  const current = (await db.select({ q: cartItems.quantity }).from(cartItems).where(and(eq(cartItems.cartId, cartId), eq(cartItems.variantId, variantId))).limit(1))[0]?.q ?? 0;
  const next = Math.min(current + qty, 99);
  if (next > available) throw new AppError("insufficient_stock", available === 1 ? "Só resta 1 unidade disponível." : `Só restam ${available} unidades disponíveis.`);
  await db.insert(cartItems).values({ cartId, variantId, quantity: next })
    .onConflictDoUpdate({ target: [cartItems.cartId, cartItems.variantId], set: { quantity: next } });
  await db.update(carts).set({ updatedAt: new Date(), userId: userId ?? undefined }).where(eq(carts.id, cartId));
  return cartId;
}

export async function setCartQuantity(variantId: string, quantity: number) {
  const cartId = await readCartId();
  if (!cartId) return;
  const qty = Math.floor(quantity);
  if (qty <= 0) {
    await db.delete(cartItems).where(and(eq(cartItems.cartId, cartId), eq(cartItems.variantId, variantId)));
  } else {
    if (qty > 99) throw new AppError("invalid_qty", "Quantidade máxima por item: 99.");
    const v = (await db.select({ onHand: productVariants.stockOnHand, reserved: productVariants.stockReserved }).from(productVariants).where(eq(productVariants.id, variantId)).limit(1))[0];
    const available = v ? v.onHand - v.reserved : 0;
    if (qty > available) throw new AppError("insufficient_stock", available > 0 ? `Só restam ${available} unidades disponíveis.` : "Produto esgotado no momento.");
    await db.update(cartItems).set({ quantity: qty }).where(and(eq(cartItems.cartId, cartId), eq(cartItems.variantId, variantId)));
  }
  await db.update(carts).set({ updatedAt: new Date() }).where(eq(carts.id, cartId));
}

export async function setCartCoupon(code: string | null) {
  const cartId = await readCartId();
  if (!cartId) throw new AppError("empty_cart", "Seu carrinho está vazio.");
  const clean = code?.trim().toUpperCase().slice(0, 40) || null;
  await db.update(carts).set({ couponCode: clean, updatedAt: new Date() }).where(eq(carts.id, cartId));
}

/** Ao fazer login, une o carrinho de visitante ao carrinho da conta. */
export async function attachCartToUser(userId: string) {
  const cartId = await readCartId();
  if (!cartId) return;
  await db.update(carts).set({ userId }).where(and(eq(carts.id, cartId), sql`${carts.userId} is null`));
}

export interface CartLineView {
  variantId: string;
  productId: string;
  productSlug: string;
  productName: string;
  variantName: string;
  sku: string;
  imageUrl: string | null;
  quantity: number;
  available: number;
  problem: null | "unavailable" | "insufficient_stock";
}

/** Carrega itens e monta entradas do motor de preços a partir do BANCO (nunca do navegador). */
export async function loadPricingLines(items: { variantId: string; quantity: number }[], tx: DbOrTx = db) {
  if (!items.length) return { inputs: [] as PricingLineInput[], views: [] as CartLineView[] };
  const ids = items.map((i) => i.variantId);
  const rows = await tx.select({
    v: productVariants, productName: products.name, productSlug: products.slug, productStatus: products.status,
    brandId: products.brandId, categoryId: products.categoryId,
  }).from(productVariants).innerJoin(products, eq(products.id, productVariants.productId)).where(inArray(productVariants.id, ids));
  const imgs = await tx.selectDistinctOn([productImages.productId], { productId: productImages.productId, url: productImages.thumbUrl, full: productImages.url })
    .from(productImages).where(inArray(productImages.productId, rows.map((r) => r.v.productId))).orderBy(productImages.productId, productImages.position);
  const variantImgs = rows.some((r) => r.v.imageId)
    ? await tx.select({ id: productImages.id, url: productImages.thumbUrl, full: productImages.url }).from(productImages).where(inArray(productImages.id, rows.filter((r) => r.v.imageId).map((r) => r.v.imageId!)))
    : [];
  const imgBy = new Map(imgs.map((i) => [i.productId, i.url ?? i.full]));
  const vImgBy = new Map(variantImgs.map((i) => [i.id, i.url ?? i.full]));
  const cats = await loadCategories(tx);
  const byId = new Map(rows.map((r) => [r.v.id, r]));
  const inputs: PricingLineInput[] = [];
  const views: CartLineView[] = [];
  for (const it of items) {
    const r = byId.get(it.variantId);
    if (!r) continue;
    const available = Math.max(0, r.v.stockOnHand - r.v.stockReserved);
    const sellable = r.v.isActive && r.productStatus === "active";
    views.push({
      variantId: r.v.id, productId: r.v.productId, productSlug: r.productSlug, productName: r.productName,
      variantName: r.v.name, sku: r.v.sku, imageUrl: (r.v.imageId && vImgBy.get(r.v.imageId)) || imgBy.get(r.v.productId) || null,
      quantity: it.quantity, available,
      problem: !sellable || available === 0 ? "unavailable" : it.quantity > available ? "insufficient_stock" : null,
    });
    inputs.push({
      variantId: r.v.id, productId: r.v.productId, brandId: r.brandId, categoryIds: categoryLineage(cats, r.categoryId),
      quantity: it.quantity, priceCents: r.v.priceCents, salePriceCents: r.v.salePriceCents, saleStartsAt: r.v.saleStartsAt, saleEndsAt: r.v.saleEndsAt,
    });
  }
  return { inputs, views };
}

export async function computePricing(args: {
  items: { variantId: string; quantity: number }[];
  couponCode: string | null;
  email: string | null;
  userId: string | null;
  shippingQuoteCents: number | null;
  shippingIsPaidMethod: boolean;
  tx?: DbOrTx;
  now?: Date;
}): Promise<{ pricing: PricingResult; views: CartLineView[] }> {
  const tx = args.tx ?? db;
  const now = args.now ?? new Date();
  const { inputs, views } = await loadPricingLines(args.items, tx);
  const promotions = await loadActivePromotions(now, tx);
  const coupon = args.couponCode ? await findCoupon(args.couponCode, tx) : null;
  const usage = coupon ? await couponUsage(coupon.id, args.email, args.userId, tx) : { total: 0, byCustomer: 0 };
  const pricing = priceCart({
    lines: inputs, promotions, coupon, couponCodeRequested: args.couponCode, couponUsage: usage,
    shippingQuoteCents: args.shippingQuoteCents, shippingIsPaidMethod: args.shippingIsPaidMethod, now,
  });
  return { pricing, views };
}

export async function getCartItems(cartId: string) {
  return db.select({ variantId: cartItems.variantId, quantity: cartItems.quantity }).from(cartItems).where(eq(cartItems.cartId, cartId)).orderBy(cartItems.addedAt);
}

export async function getCartView(userEmail: string | null = null, userId: string | null = null) {
  const cartId = await readCartId();
  if (!cartId) return null;
  const cart = (await db.select().from(carts).where(eq(carts.id, cartId)).limit(1))[0];
  if (!cart || cart.convertedOrderId) return null;
  const items = await getCartItems(cartId);
  if (!items.length) return { cart, lines: [], pricing: null };
  const { pricing, views } = await computePricing({ items, couponCode: cart.couponCode, email: userEmail, userId, shippingQuoteCents: null, shippingIsPaidMethod: false });
  return { cart, lines: views, pricing };
}

export async function cartCount(): Promise<number> {
  const cartId = await readCartId();
  if (!cartId) return 0;
  const [r] = await db.select({ n: sql<number>`coalesce(sum(${cartItems.quantity}),0)::int` }).from(cartItems)
    .innerJoin(carts, eq(carts.id, cartItems.cartId)).where(and(eq(cartItems.cartId, cartId), sql`${carts.convertedOrderId} is null`));
  return r?.n ?? 0;
}
