import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { getCartView } from "@/server/services/cart";
import { getCurrentUser } from "@/server/auth/session";
import { QtyControl, CouponForm, FixQuantity } from "@/components/cart/CartClient";
import { Summary } from "@/components/cart/Summary";
import { EmptyState, Notice } from "@/components/ui/States";
import { formatBRL } from "@/lib/money";
import { COUPON_ERROR_MESSAGES } from "@/lib/pricing";

export const metadata: Metadata = { title: "Carrinho", robots: { index: false } };

export default async function CartPage() {
  const user = await getCurrentUser();
  const view = await getCartView(user?.email ?? null, user?.id ?? null);
  if (!view || !view.lines.length || !view.pricing) {
    return <div className="container-tv py-12"><EmptyState title="Seu carrinho está vazio" text="Que tal dar uma olhada nas novidades?" action={{ href: "/", label: "Explorar brinquedos" }} emoji="🛒" /></div>;
  }
  const { lines, pricing, cart } = view;
  const byVariant = new Map(pricing.lines.map((l) => [l.variantId, l]));
  const blocked = lines.some((l) => l.problem);

  return (
    <div className="container-tv py-6">
      <h1 className="text-3xl font-extrabold text-primary-dark sm:text-4xl">Carrinho</h1>
      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_380px]">
        <ul className="space-y-3">
          {lines.map((l) => {
            const p = byVariant.get(l.variantId)!;
            return (
              <li key={l.variantId} className="card flex gap-3 p-3 sm:gap-4 sm:p-4">
                <Link href={`/produto/${l.productSlug}`} className="relative size-24 shrink-0 overflow-hidden rounded-2xl bg-soft-yellow sm:size-28">
                  {l.imageUrl ? <Image src={l.imageUrl} alt="" fill sizes="112px" className="object-contain p-1" /> : <span className="grid size-full place-items-center text-3xl" aria-hidden>🧸</span>}
                </Link>
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <Link href={`/produto/${l.productSlug}`} className="line-clamp-2 font-bold hover:text-primary">{l.productName}</Link>
                  {l.variantName !== "Padrão" && <p className="text-sm text-muted">{l.variantName}</p>}
                  <div className="text-sm">
                    {p.unitCents < p.listUnitCents && <s className="mr-2 text-muted">{formatBRL(p.listUnitCents)}</s>}
                    <span className={`font-extrabold ${p.unitCents < p.listUnitCents ? "text-promo" : ""}`}>{formatBRL(p.unitCents)}</span>
                    {p.promotionLabel && <span className="chip ml-2 bg-soft-red text-promo">{p.promotionLabel}</span>}
                  </div>
                  {l.problem && (
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <Notice kind="error">{l.problem === "unavailable" ? "Indisponível no momento." : `Só ${l.available} disponível(is).`}</Notice>
                      <FixQuantity variantId={l.variantId} available={l.problem === "unavailable" ? 0 : l.available} />
                    </div>
                  )}
                  <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-2">
                    <QtyControl variantId={l.variantId} quantity={l.quantity} max={l.available} name={l.productName} />
                    <span className="font-extrabold">{formatBRL(p.lineSubtotalCents)}</span>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
        <aside className="lg:sticky lg:top-36 lg:self-start">
          <div className="card space-y-5 p-5">
            <CouponForm applied={pricing.couponCode} />
            {cart.couponCode && pricing.couponError && <Notice kind="error">{COUPON_ERROR_MESSAGES[pricing.couponError]}</Notice>}
            <Summary pricing={pricing} />
            {blocked ? (
              <button type="button" className="btn btn-primary w-full" aria-disabled="true" disabled>Ajuste os itens para continuar</button>
            ) : (
              <Link href="/checkout" className="btn btn-primary w-full">Finalizar compra</Link>
            )}
            <Link href="/" className="btn btn-ghost w-full">Continuar comprando</Link>
            <p className="text-center text-xs text-muted">Preços, descontos e estoque são confirmados ao finalizar.</p>
          </div>
        </aside>
      </div>
    </div>
  );
}
