import Link from "next/link";
import { listProducts, getFacetBrands, SORT_OPTIONS, type ListFilters, type SortKey } from "@/server/services/catalog";
import { myFavoriteIds } from "@/server/services/favorites";
import { AGE_BANDS } from "@/lib/age";
import { parseBRLToCents, centsToInput } from "@/lib/money";
import { ProductGrid } from "../product/ProductCard";
import { EmptyState } from "../ui/States";
import { FilterPanel } from "./FilterPanel";

export type SP = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
const many = (v: string | string[] | undefined) => (Array.isArray(v) ? v : v ? [v] : []);

export async function parseFilters(sp: SP, base: Partial<ListFilters> = {}): Promise<{ filters: ListFilters; brandSlugs: string[] }> {
  const brands = await getFacetBrands();
  const brandSlugs = many(sp.marca).slice(0, 20);
  const brandIds = brands.filter((b) => brandSlugs.includes(b.slug)).map((b) => b.id);
  const sort = SORT_OPTIONS.some((o) => o.key === one(sp.ordem)) ? (one(sp.ordem) as SortKey) : undefined;
  return {
    brandSlugs,
    filters: {
      ...base,
      q: base.q ?? (one(sp.q).slice(0, 80) || undefined),
      ageBand: one(sp.idade) || base.ageBand,
      brandIds: brandIds.length ? brandIds : undefined,
      priceMinCents: parseBRLToCents(one(sp.min)) ?? base.priceMinCents,
      priceMaxCents: parseBRLToCents(one(sp.max)) ?? base.priceMaxCents,
      inStock: one(sp.estoque) === "1" || base.inStock,
      onSale: one(sp.promo) === "1" || base.onSale,
      sort: sort ?? base.sort,
      page: Number(one(sp.pagina)) || 1,
      perPage: 24,
    },
  };
}

export async function Catalog({ sp, base = {}, basePath, hidden = {}, subcategories = [] }: {
  sp: SP; base?: Partial<ListFilters>; basePath: string; hidden?: Record<string, string>;
  subcategories?: { slug: string; name: string }[];
}) {
  const { filters, brandSlugs } = await parseFilters(sp, base);
  const [{ items, total, page, pages }, brands, favorites] = await Promise.all([listProducts(filters), getFacetBrands(), myFavoriteIds()]);
  const active = [filters.ageBand, brandSlugs.length, one(sp.min), one(sp.max), one(sp.estoque), one(sp.promo)].filter(Boolean).length;
  const qs = (over: Record<string, string | null>) => {
    const u = new URLSearchParams();
    for (const [k, v] of Object.entries(sp)) for (const x of many(v)) u.append(k, x);
    for (const [k, v] of Object.entries(over)) { u.delete(k); if (v) u.set(k, v); }
    const s = u.toString();
    return s ? `${basePath}?${s}` : basePath;
  };

  const form = (
    <form action={basePath} method="get" className="space-y-5">
      {Object.entries(hidden).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      {filters.q && !hidden.q && <input type="hidden" name="q" value={filters.q} />}
      {subcategories.length > 0 && (
        <fieldset>
          <legend className="label">Subcategorias</legend>
          <ul className="flex flex-wrap gap-2 lg:flex-col lg:gap-1">
            {subcategories.map((c) => <li key={c.slug}><Link href={`/c/${c.slug}`} className="chip bg-soft-blue text-primary-dark lg:rounded-lg lg:bg-transparent lg:px-0 lg:text-sm lg:hover:underline">{c.name}</Link></li>)}
          </ul>
        </fieldset>
      )}
      <fieldset>
        <legend className="label">Idade</legend>
        <div className="grid grid-cols-2 gap-1.5 lg:grid-cols-1">
          <label className="flex min-h-[40px] items-center gap-2 rounded-xl px-2 text-sm hover:bg-cream"><input type="radio" name="idade" value="" defaultChecked={!filters.ageBand} className="size-4 accent-[var(--tv-primary)]" /> Todas</label>
          {AGE_BANDS.map((b) => (
            <label key={b.key} className="flex min-h-[40px] items-center gap-2 rounded-xl px-2 text-sm hover:bg-cream">
              <input type="radio" name="idade" value={b.key} defaultChecked={filters.ageBand === b.key} className="size-4 accent-[var(--tv-primary)]" /> {b.label}
            </label>
          ))}
        </div>
      </fieldset>
      {brands.length > 0 && (
        <fieldset>
          <legend className="label">Marca</legend>
          <div className="max-h-56 space-y-1 overflow-y-auto">
            {brands.map((b) => (
              <label key={b.id} className="flex min-h-[40px] items-center gap-2 rounded-xl px-2 text-sm hover:bg-cream">
                <input type="checkbox" name="marca" value={b.slug} defaultChecked={brandSlugs.includes(b.slug)} className="size-4 accent-[var(--tv-primary)]" /> {b.name}
              </label>
            ))}
          </div>
        </fieldset>
      )}
      <fieldset>
        <legend className="label">Preço (R$)</legend>
        <div className="flex items-center gap-2">
          <input name="min" inputMode="decimal" placeholder="Mín." aria-label="Preço mínimo" defaultValue={centsToInput(filters.priceMinCents)} className="field !min-h-[42px]" />
          <span aria-hidden>–</span>
          <input name="max" inputMode="decimal" placeholder="Máx." aria-label="Preço máximo" defaultValue={centsToInput(filters.priceMaxCents)} className="field !min-h-[42px]" />
        </div>
      </fieldset>
      <fieldset className="space-y-1">
        <legend className="label">Mostrar</legend>
        <label className="flex min-h-[40px] items-center gap-2 rounded-xl px-2 text-sm hover:bg-cream"><input type="checkbox" name="estoque" value="1" defaultChecked={!!filters.inStock} className="size-4 accent-[var(--tv-primary)]" /> Somente disponíveis</label>
        {!base.onSale && <label className="flex min-h-[40px] items-center gap-2 rounded-xl px-2 text-sm hover:bg-cream"><input type="checkbox" name="promo" value="1" defaultChecked={!!filters.onSale} className="size-4 accent-[var(--tv-primary)]" /> Em promoção</label>}
      </fieldset>
      <div>
        <label className="label" htmlFor="ordem">Ordenar por</label>
        <select id="ordem" name="ordem" defaultValue={filters.sort ?? ""} className="field">
          <option value="">Padrão</option>
          {SORT_OPTIONS.filter((o) => o.key !== "relevance" || filters.q).map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
        </select>
      </div>
      <div className="sticky bottom-0 flex gap-2 bg-white pb-1 pt-2 lg:static lg:bg-transparent">
        <button type="submit" className="btn btn-primary flex-1">Aplicar</button>
        {active > 0 && <Link href={qs({ idade: null, marca: null, min: null, max: null, estoque: null, promo: null, pagina: null })} className="btn btn-ghost">Limpar</Link>}
      </div>
    </form>
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[250px_1fr]">
      <div className="flex items-center justify-between gap-3 lg:block">
        <p className="text-sm font-bold text-muted lg:hidden" aria-live="polite">{total} {total === 1 ? "produto" : "produtos"}</p>
        <FilterPanel activeCount={active}>{form}</FilterPanel>
      </div>
      <div>
        <p className="mb-3 hidden text-sm font-bold text-muted lg:block" aria-live="polite">{total} {total === 1 ? "produto encontrado" : "produtos encontrados"}</p>
        {items.length === 0 ? (
          <EmptyState title="Nenhum brinquedo encontrado" text={active ? "Tente remover alguns filtros." : filters.q ? `Não encontramos resultados para “${filters.q}”. Confira a ortografia ou use termos mais gerais.` : "Ainda não há produtos aqui."}
            action={active ? { href: qs({ idade: null, marca: null, min: null, max: null, estoque: null, promo: null, pagina: null }), label: "Limpar filtros" } : { href: "/", label: "Voltar ao início" }} emoji="🔎" />
        ) : (
          <ProductGrid items={items} favorites={favorites} priorityFirst />
        )}
        {pages > 1 && (
          <nav aria-label="Paginação" className="mt-8 flex items-center justify-center gap-2">
            {page > 1 && <Link className="btn btn-outline btn-sm" href={qs({ pagina: String(page - 1) })} rel="prev">Anterior</Link>}
            <span className="text-sm font-bold text-muted">Página {page} de {pages}</span>
            {page < pages && <Link className="btn btn-outline btn-sm" href={qs({ pagina: String(page + 1) })} rel="next">Próxima</Link>}
          </nav>
        )}
      </div>
    </div>
  );
}
