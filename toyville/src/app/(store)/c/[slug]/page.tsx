import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCategoryBySlug } from "@/server/services/catalog";
import { Catalog, type SP } from "@/components/catalog/Catalog";
import { Breadcrumb } from "@/components/ui/States";

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
      <h1 className="mt-3 text-3xl font-extrabold text-primary-dark sm:text-4xl">{c.category.name}</h1>
      {c.category.description && <p className="mt-1 text-muted">{c.category.description}</p>}
      <div className="mt-6">
        <Catalog sp={await searchParams} base={{ categoryId: c.category.id }} basePath={`/c/${slug}`} subcategories={c.children.map((x) => ({ slug: x.slug, name: x.name }))} />
      </div>
    </div>
  );
}
