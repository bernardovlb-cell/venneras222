import type { Metadata } from "next";
import { listProducts, getFeaturedCategories } from "@/server/services/catalog";
import { myFavoriteIds } from "@/server/services/favorites";
import { BUDGETS } from "@/lib/gift";
import { GiftFinderPanel } from "@/components/gift/GiftFinderPanel";
import { ProductGrid } from "@/components/product/ProductCard";
import { EmptyState } from "@/components/ui/States";
import { ageBand } from "@/lib/age";

export const metadata: Metadata = { title: "Encontre o presente perfeito", description: "Sugestões de brinquedos por idade, orçamento e interesse." };

type SP = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

/**
 * Guia de presentes: regras determinísticas sobre o catálogo REAL (sem IA, sem itens inventados).
 * Filtra por faixa etária (sobreposição), orçamento e categoria; prioriza disponíveis e mais vendidos.
 */
export default async function GiftFinderPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const idade = one(sp.idade), orcamento = one(sp.orcamento), categoria = one(sp.categoria);
  const cats = (await getFeaturedCategories()).map((c) => ({ id: c.id, name: c.name }));
  const band = ageBand(idade);
  const budget = BUDGETS.find((b) => b.key === orcamento);
  const validCat = cats.some((c) => c.id === categoria) ? categoria : undefined;
  const result = band
    ? await listProducts({ ageBand: band.key, priceMinCents: budget?.min ?? undefined, priceMaxCents: budget?.max ?? undefined, categoryId: validCat, inStock: true, sort: "best_sellers", perPage: 24 })
    : null;
  const favorites = await myFavoriteIds();

  return (
    <div className="container-tv py-6">
      <GiftFinderPanel framed headingLevel="h1" title="Encontre o presente perfeito"
        subtitle="Conte a idade, o orçamento e o que a criança curte. Sugerimos brinquedos disponíveis na loja."
        categories={cats} defaults={{ idade, orcamento, categoria }} />

      {result && (
        <section className="mt-8" aria-live="polite">
          <h2 className="mb-5 text-[1.6rem] font-extrabold leading-tight text-primary-dark sm:text-3xl">
            {result.total > 0 ? `${result.total} ${result.total === 1 ? "sugestão" : "sugestões"} para ${band!.label.toLowerCase()}${budget ? `, ${budget.label.toLowerCase()}` : ""}` : "Sem sugestões para essa combinação"}
          </h2>
          {result.total === 0 ? (
            <EmptyState title="Ainda não temos um presente com esses critérios" text="Tente outro orçamento ou deixe a categoria em aberto." emoji="🎁" />
          ) : (
            <ProductGrid items={result.items} favorites={favorites} />
          )}
        </section>
      )}
    </div>
  );
}
