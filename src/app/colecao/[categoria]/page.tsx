import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Colecao } from "@/components/Colecao";
import { categorias, type Categoria } from "@/data/products";

export const dynamicParams = false;

export function generateStaticParams() {
  return categorias.map((c) => ({ categoria: c.slug }));
}

type Props = { params: Promise<{ categoria: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { categoria } = await params;
  const c = categorias.find((x) => x.slug === categoria);
  if (!c) return {};
  return {
    title: c.nome,
    description: `${c.nome} com curadoria Venneras.`,
    alternates: { canonical: `/colecao/${c.slug}` },
  };
}

export default async function Page({ params }: Props) {
  const slug = (await params).categoria;
  if (!categorias.some((c) => c.slug === slug)) notFound();
  return <Colecao categoria={slug as Categoria} />;
}
