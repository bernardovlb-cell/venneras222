import Link from "next/link";
import type { ProductCard as Card } from "@/server/services/catalog";
import { ProductImage } from "./ProductImage";
import { Price } from "./Price";
import { Rating } from "./Rating";
import { Countdown } from "./Countdown";
import { QuickAdd, FavoriteButton } from "./CardActions";
import { formatAgeRange } from "@/lib/age";
import { discountPercent } from "@/lib/money";


export function ProductCard({ p, favorited = false, priority = false }: { p: Card; favorited?: boolean; priority?: boolean }) {
  const age = formatAgeRange(p.minAgeMonths, p.maxAgeMonths);
  const off = discountPercent(p.listPriceCents, p.priceCents);
  const onSale = off > 0;
  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-xl border border-line bg-white transition duration-200 hover:border-primary/30 hover:shadow-card focus-within:ring-2 focus-within:ring-primary">
      <div className="relative aspect-square overflow-hidden bg-[#f6f5f1]">
        <Link href={`/produto/${p.slug}`} tabIndex={-1} aria-hidden className="absolute inset-0">
          <ProductImage src={p.imageUrl} alt={p.imageAlt} sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw" priority={priority}
            className="p-4 mix-blend-multiply transition duration-300 group-hover:scale-[1.04]" />
        </Link>
        <div className="pointer-events-none absolute left-2 top-2 flex flex-col items-start gap-1.5">
          {onSale && <span className="rounded-md bg-promo px-2 py-1 text-xs font-extrabold leading-none text-white" aria-hidden>-{off}%</span>}
          {p.promotionLabel && onSale && <span className="rounded-md bg-white px-2 py-1 text-xs font-extrabold leading-none text-promo-ink">{p.promotionLabel}</span>}
        </div>
        {!p.inStock && (
          <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-ink/80 py-1.5 text-center text-xs font-extrabold text-white">Esgotado</span>
        )}
        <FavoriteButton productId={p.id} initial={favorited} className="absolute right-2 top-2 z-10" />
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-3 sm:p-3.5">
        {p.brandName && <p className="truncate text-[11px] font-bold uppercase tracking-wider text-muted">{p.brandName}</p>}
        <h3 className="line-clamp-2 min-h-[2.6em] text-[15px] font-bold leading-snug text-ink">
          <Link href={`/produto/${p.slug}`} className="after:absolute after:inset-0 after:content-['']">{p.name}</Link>
        </h3>
        {(age || p.ratingAvg != null) && (
          <div className="flex flex-wrap items-center gap-2">
            {age && <span className="whitespace-nowrap rounded-md bg-soft-blue px-2 py-0.5 text-[11.5px] font-bold text-primary-dark">{age}</span>}
            {p.ratingAvg != null && <Rating value={p.ratingAvg} count={p.ratingCount} size={12} />}
          </div>
        )}
        <div className="mt-auto pt-1.5">
          {p.variantCount > 1 && <p className="text-xs text-muted">a partir de</p>}
          <Price priceCents={p.priceCents} listPriceCents={p.listPriceCents} size="sm" hideBadge />
          {onSale && p.promotionEndsAt && <p className="mt-1 text-xs font-bold text-promo-ink"><Countdown endsAt={p.promotionEndsAt.toISOString()} compact /></p>}
        </div>
        <div className="relative z-10 pt-2">
          {p.inStock && p.defaultVariantId ? (
            <QuickAdd variantId={p.defaultVariantId} productName={p.name} priceCents={p.priceCents} />
          ) : (
            <Link href={`/produto/${p.slug}`} className="btn btn-outline btn-sm w-full">{p.inStock ? "Ver opções" : "Ver detalhes"}</Link>
          )}
        </div>
      </div>
    </article>
  );
}

export function ProductGrid({ items, favorites = new Set<string>(), priorityFirst = false }: { items: Card[]; favorites?: Set<string>; priorityFirst?: boolean }) {
  return (
    <ul className="grid grid-cols-2 gap-2.5 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
      {items.map((p, i) => <li key={p.id}><ProductCard p={p} favorited={favorites.has(p.id)} priority={priorityFirst && i < 2} /></li>)}
    </ul>
  );
}

/** Vitrine: desliza no celular; grade a partir do tablet. `compact`: cards de largura fixa (para poucos itens). */
export function ProductRail({ items, favorites = new Set<string>(), compact = false }: { items: Card[]; favorites?: Set<string>; compact?: boolean }) {
  return (
    <ul className={`scrollbar-none -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-3 pt-1 sm:mx-0 sm:gap-4 sm:overflow-visible sm:px-0 ${compact ? "sm:[&>li]:w-[230px]" : "sm:grid sm:grid-cols-3 lg:grid-cols-4"}`}>
      {items.map((p) => (
        // Um item só: card maior no celular, sem deixar meia vitrine vazia.
        <li key={p.id} className={`${items.length === 1 ? "w-[68%]" : "w-[47%]"} shrink-0 snap-start sm:w-auto`}><ProductCard p={p} favorited={favorites.has(p.id)} /></li>
      ))}
    </ul>
  );
}
