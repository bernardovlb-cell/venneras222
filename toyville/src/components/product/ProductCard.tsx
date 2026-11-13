import Link from "next/link";
import type { ProductCard as Card } from "@/server/services/catalog";
import { ProductImage } from "./ProductImage";
import { Price } from "./Price";
import { Rating } from "./Rating";
import { Countdown } from "./Countdown";
import { QuickAdd, FavoriteButton } from "./CardActions";
import { formatAgeRange } from "@/lib/age";

export function ProductCard({ p, favorited = false, priority = false }: { p: Card; favorited?: boolean; priority?: boolean }) {
  const age = formatAgeRange(p.minAgeMonths, p.maxAgeMonths);
  const onSale = p.priceCents < p.listPriceCents;
  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-[1.4rem] bg-white shadow-card transition duration-200 hover:-translate-y-1 hover:shadow-pop">
      <div className="relative aspect-square overflow-hidden bg-white">
        <Link href={`/produto/${p.slug}`} tabIndex={-1} aria-hidden className="absolute inset-0">
          <ProductImage src={p.imageUrl} alt={p.imageAlt} sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw" priority={priority} className="p-3 transition duration-300 group-hover:scale-[1.04]" />
        </Link>
        <div className="pointer-events-none absolute left-2.5 top-2.5 flex flex-col items-start gap-1.5">
          {p.promotionLabel && onSale && <span className="chip bg-promo text-white">{p.promotionLabel}</span>}
          {!p.inStock && <span className="chip bg-ink text-white">Esgotado</span>}
        </div>
        <FavoriteButton productId={p.id} initial={favorited} className="absolute right-2.5 top-2.5 z-10" />
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-3.5 sm:p-4">
        {p.brandName && <p className="truncate text-[11px] font-extrabold uppercase tracking-wider text-muted">{p.brandName}</p>}
        <h3 className="line-clamp-2 min-h-[2.6em] text-[15px] font-bold leading-snug">
          <Link href={`/produto/${p.slug}`} className="after:absolute after:inset-0 after:content-['']">{p.name}</Link>
        </h3>
        <div className="flex flex-wrap items-center gap-2">
          {age && <span className="chip bg-soft-blue text-primary-dark">{age}</span>}
          {p.ratingAvg != null && <Rating value={p.ratingAvg} count={p.ratingCount} size={12} />}
        </div>
        <div className="mt-auto pt-1">
          {p.variantCount > 1 && <p className="text-xs text-muted">a partir de</p>}
          <Price priceCents={p.priceCents} listPriceCents={p.listPriceCents} size="sm" />
          {onSale && p.promotionEndsAt && <p className="mt-1 text-promo"><Countdown endsAt={p.promotionEndsAt.toISOString()} compact /></p>}
        </div>
        <div className="relative z-10 pt-2">
          {p.inStock && p.defaultVariantId ? (
            <QuickAdd variantId={p.defaultVariantId} productName={p.name} priceCents={p.priceCents} />
          ) : (
            <Link href={`/produto/${p.slug}`} className="btn btn-outline btn-sm w-full">{p.inStock ? "Escolher opção" : "Ver detalhes"}</Link>
          )}
        </div>
      </div>
    </article>
  );
}

export function ProductGrid({ items, favorites = new Set<string>(), priorityFirst = false }: { items: Card[]; favorites?: Set<string>; priorityFirst?: boolean }) {
  return (
    <ul className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
      {items.map((p, i) => <li key={p.id}><ProductCard p={p} favorited={favorites.has(p.id)} priority={priorityFirst && i < 2} /></li>)}
    </ul>
  );
}

export function ProductRail({ items, favorites = new Set<string>() }: { items: Card[]; favorites?: Set<string> }) {
  return (
    <ul className="scrollbar-none -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-3 sm:gap-4 sm:overflow-visible sm:px-0 lg:grid-cols-4">
      {items.map((p) => <li key={p.id} className="w-[46%] shrink-0 snap-start sm:w-auto"><ProductCard p={p} favorited={favorites.has(p.id)} /></li>)}
    </ul>
  );
}
