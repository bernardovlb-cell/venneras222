import "server-only";
import { cache } from "react";
import { and, eq, sql, ne, or, isNull, lte, gt } from "drizzle-orm";
import { db, type DbOrTx } from "../db/client";
import { categories, couponRedemptions, coupons, promotions } from "../db/schema";
import type { CouponInput, CouponUsage, PromotionInput } from "@/lib/pricing";

export async function loadActivePromotions(now = new Date(), tx: DbOrTx = db): Promise<PromotionInput[]> {
  const rows = await tx.select().from(promotions).where(and(
    eq(promotions.isActive, true),
    or(isNull(promotions.startsAt), lte(promotions.startsAt, now)),
    or(isNull(promotions.endsAt), gt(promotions.endsAt, now)),
  ));
  return rows.map((p) => ({
    id: p.id, name: p.name, kind: p.kind, value: p.value, scope: p.scope, minSubtotalCents: p.minSubtotalCents,
    startsAt: p.startsAt, endsAt: p.endsAt, isActive: p.isActive, isFlash: p.isFlash, badge: p.badge,
  }));
}

export const getActivePromotions = cache(() => loadActivePromotions(new Date()));

export interface CategoryNode { id: string; parentId: string | null; name: string; slug: string; position: number; isActive: boolean; isFeatured: boolean; imageUrl: string | null; description: string | null }

export async function loadCategories(tx: DbOrTx = db): Promise<CategoryNode[]> {
  return tx.select({
    id: categories.id, parentId: categories.parentId, name: categories.name, slug: categories.slug, position: categories.position,
    isActive: categories.isActive, isFeatured: categories.isFeatured, imageUrl: categories.imageUrl, description: categories.description,
  }).from(categories).orderBy(categories.position, categories.name);
}

export const getCategories = cache(() => loadCategories());

/** ids da categoria + todos os ancestrais (para regras de promoção por categoria pai). */
export function categoryLineage(cats: CategoryNode[], id: string | null): string[] {
  if (!id) return [];
  const byId = new Map(cats.map((c) => [c.id, c]));
  const out: string[] = [];
  let cur = byId.get(id);
  let guard = 0;
  while (cur && guard++ < 20) {
    out.push(cur.id);
    cur = cur.parentId ? byId.get(cur.parentId) : undefined;
  }
  return out;
}

/** ids da categoria + todas as descendentes (para filtrar a listagem). */
export function categoryDescendants(cats: CategoryNode[], id: string): string[] {
  const out = [id];
  for (let i = 0; i < out.length && i < 500; i++) for (const c of cats) if (c.parentId === out[i]) out.push(c.id);
  return out;
}

export async function findCoupon(code: string, tx: DbOrTx = db): Promise<CouponInput | null> {
  const c = (await tx.select().from(coupons).where(sql`upper(${coupons.code}) = upper(${code.trim()})`).limit(1))[0];
  if (!c) return null;
  return {
    id: c.id, code: c.code, type: c.type, value: c.value, minSubtotalCents: c.minSubtotalCents, maxDiscountCents: c.maxDiscountCents,
    startsAt: c.startsAt, endsAt: c.endsAt, usageLimit: c.usageLimit, usageLimitPerCustomer: c.usageLimitPerCustomer,
    combinableWithPromotions: c.combinableWithPromotions, scope: c.scope, isActive: c.isActive,
  };
}

export async function couponUsage(couponId: string, email: string | null, userId: string | null, tx: DbOrTx = db, excludeOrderId?: string): Promise<CouponUsage> {
  const base = and(eq(couponRedemptions.couponId, couponId), eq(couponRedemptions.voided, false), excludeOrderId ? ne(couponRedemptions.orderId, excludeOrderId) : undefined);
  const [t] = await tx.select({ n: sql<number>`count(*)::int` }).from(couponRedemptions).where(base);
  let byCustomer = 0;
  if (email || userId) {
    const [c] = await tx.select({ n: sql<number>`count(*)::int` }).from(couponRedemptions).where(and(
      base,
      sql`(lower(${couponRedemptions.email}) = lower(${email ?? ""}) ${userId ? sql`or ${couponRedemptions.userId} = ${userId}` : sql``})`,
    ));
    byCustomer = c.n;
  }
  return { total: t.n, byCustomer };
}
