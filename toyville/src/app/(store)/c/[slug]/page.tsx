import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCategoryBySlug } from "@/server/services/catalog";
import { Catalog, type SP } from "@/components/catalog/Catalog";
import { Breadcrumb } from "@/components/ui/States";
import { CategoryArt } from "@/components/art/ToyArt";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<SP> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const c = await getCategoryBySlug(slug);
  if (!c) return { title: "Categoria não encontrada" };
  return { title: c.category.name, description: c.category.description ?? `${c.category.name} na ToyVille.`, alternates: { canonical: `/c/${slug}` } };
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const c = await getCategoryBySlug(slug);
  if (!c) notFound();
  return (
    <div className="container-tv py-6">
      <Breadcrumb items={[{ name: "Início", href: "/" }, ...c.breadcrumb.map((b, i) => (i === c.breadcrumb.length - 1 ? { name: b.name } : { name: b.name, href: `/c/${b.slug}` }))]} />
      <div className="tv-hero-bg relative mt-3 flex items-center justify-between gap-4 overflow-hidden rounded-[2rem] px-5 py-5 ring-1 ring-line/60 sm:px-10 sm:py-7">
        <div className="min-w-0">
          <p className="eyebrow">Categoria</p>
          <h1 className="text-[2rem] font-extrabold leading-[1.02] text-primary-dark sm:text-5xl">{c.category.name}</h1>
          {c.category.description && <p className="mt-2 max-w-xl text-muted sm:text-lg">{c.category.description}</p>}
        </div>
        <CategoryArt slug={c.category.slug} className="tv-float size-24 shrink-0 sm:size-36" />
      </div>
      <div className="mt-6">
        <Catalog sp={await searchParams} base={{ categoryId: c.category.id }} basePath={`/c/${slug}`} subcategories={c.children.map((x) => ({ slug: x.slug, name: x.name }))} />
      </div>
    </div>
  );
}
