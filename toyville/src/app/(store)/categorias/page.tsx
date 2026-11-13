import type { Metadata } from "next";
import Link from "next/link";
import { getHomeCategories } from "@/server/services/catalog";
import { CategoryCard } from "@/components/catalog/CategoryCard";
import { Breadcrumb, EmptyState } from "@/components/ui/States";

export const metadata: Metadata = { title: "Todas as categorias", description: "Todas as categorias de brinquedos da ToyVille.", alternates: { canonical: "/categorias" } };

/** Todas as categorias ativas (e suas subcategorias), direto do banco. */
export default async function CategoriesPage() {
  const cats = await getHomeCategories();
  return (
    <div className="container-tv py-6">
      <Breadcrumb items={[{ name: "Início", href: "/" }, { name: "Categorias" }]} />
      <h1 className="mt-3 text-3xl font-semibold leading-tight text-primary-dark sm:text-4xl">Todas as categorias</h1>
      <p className="mt-1 text-muted">Escolha pelo tipo de brinquedo.</p>
      {cats.length === 0 ? (
        <div className="mt-8"><EmptyState title="Nenhuma categoria cadastrada ainda" action={{ href: "/", label: "Voltar ao início" }} /></div>
      ) : (
        <ul className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
          {cats.map((c, i) => (
            <li key={c.id} className="flex flex-col gap-2">
              <CategoryCard c={c} i={i} heading="h2" />
              {c.children.length > 0 && (
                <ul className="flex flex-wrap gap-x-3 gap-y-1 px-1 text-sm">
                  {c.children.map((ch) => <li key={ch.id}><Link href={`/c/${ch.slug}`} className="inline-flex min-h-[28px] items-center font-semibold text-primary hover:underline">{ch.name}</Link></li>)}
                </ul>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
