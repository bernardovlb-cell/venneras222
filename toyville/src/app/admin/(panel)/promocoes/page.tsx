import { desc, sql } from "drizzle-orm";
import { requireStaffPage } from "@/server/auth/guards";
import { db } from "@/server/db/client";
import { coupons, promotions } from "@/server/db/schema";
import { categoryOptions, brandOptions, productOptions } from "@/server/services/admin-lookups";
import { PageHead, Panel, toLocalInput } from "@/components/admin/server-ui";
import { CouponEditor, PromotionEditor } from "@/components/admin/PromoEditors";
import { centsToInput, formatBRL } from "@/lib/money";
import { isWithin } from "@/lib/pricing";

export default async function Promotions() {
  await requireStaffPage("promotions.write");
  const [cs, ps, cats, brands, prods] = await Promise.all([
    db.select({ c: coupons, uses: sql<number>`(select count(*)::int from coupon_redemptions r where r.coupon_id = ${coupons.id} and not r.voided)` }).from(coupons).orderBy(desc(coupons.createdAt)),
    db.select().from(promotions).orderBy(desc(promotions.createdAt)),
    categoryOptions(), brandOptions(), productOptions(),
  ]);
  const opts = { categories: cats.map((c) => ({ id: c.id, name: "— ".repeat(c.depth) + c.name })), brands: brands.map((b) => ({ id: b.id, name: b.name })), products: prods.map((p) => ({ id: p.id, name: `${p.name} (${p.sku})` })) };
  const now = new Date();
  return (
    <div className="max-w-6xl space-y-6">
      <PageHead title="Promoções e cupons" subtitle="Todas as regras são validadas no servidor no carrinho e no checkout." />
      <Panel title="Descontos automáticos, ofertas relâmpago e frete grátis">
        <ul className="divide-y divide-line">
          {ps.map((p) => (
            <li key={p.id} className="py-2.5">
              <PromotionEditor opts={opts} p={{
                id: p.id, name: p.name, kind: p.kind, value: p.kind === "fixed_off" ? centsToInput(p.value) : String(p.value || ""), minSubtotal: centsToInput(p.minSubtotalCents),
                valueLabel: p.kind === "percent_off" ? `${p.value}% off` : p.kind === "fixed_off" ? `${formatBRL(p.value)} off/un.` : `Frete grátis acima de ${formatBRL(p.minSubtotalCents)}`,
                startsAt: toLocalInput(p.startsAt), endsAt: toLocalInput(p.endsAt), isFlash: p.isFlash, badge: p.badge, isActive: p.isActive, live: p.isActive && isWithin(now, p.startsAt, p.endsAt), scope: p.scope,
              }} />
            </li>
          ))}
        </ul>
        <div className="mt-3 border-t border-line pt-3"><PromotionEditor opts={opts} /></div>
      </Panel>
      <Panel title="Cupons">
        <ul className="divide-y divide-line">
          {cs.map(({ c, uses }) => (
            <li key={c.id} className="py-2.5">
              <CouponEditor opts={opts} c={{
                id: c.id, code: c.code, description: c.description, type: c.type, uses, value: c.type === "fixed" ? centsToInput(c.value) : c.type === "percent" ? String(c.value) : "",
                valueLabel: c.type === "percent" ? `${c.value}%` : c.type === "fixed" ? formatBRL(c.value) : "Frete grátis",
                minSubtotal: centsToInput(c.minSubtotalCents || null), maxDiscount: centsToInput(c.maxDiscountCents), startsAt: toLocalInput(c.startsAt), endsAt: toLocalInput(c.endsAt),
                usageLimit: c.usageLimit, usageLimitPerCustomer: c.usageLimitPerCustomer, combinableWithPromotions: c.combinableWithPromotions, isActive: c.isActive, scope: c.scope,
              }} />
            </li>
          ))}
        </ul>
        <div className="mt-3 border-t border-line pt-3"><CouponEditor opts={opts} /></div>
      </Panel>
    </div>
  );
}
