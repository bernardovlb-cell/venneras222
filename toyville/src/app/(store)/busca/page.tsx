import type { Metadata } from "next";
import { Catalog, type SP } from "@/components/catalog/Catalog";
import { SearchBox } from "@/components/layout/SearchBox";

type Props = { searchParams: Promise<SP> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const q = (await searchParams).q;
  const term = Array.isArray(q) ? q[0] : q;
  return { title: term ? `Busca: ${term}` : "Todos os brinquedos", robots: term ? { index: false, follow: true } : undefined };
}

export default async function SearchPage({ searchParams }: Props) {
  const sp = await searchParams;
  const q = (Array.isArray(sp.q) ? sp.q[0] : sp.q)?.trim() ?? "";
  return (
    <div className="container-tv py-6">
      <h1 className="text-3xl font-extrabold text-primary-dark sm:text-4xl">{q ? <>Resultados para “{q}”</> : "Todos os brinquedos"}</h1>
      <div className="mt-4 max-w-2xl lg:hidden"><SearchBox initial={q} /></div>
      <div className="mt-6"><Catalog sp={sp} basePath="/busca" /></div>
    </div>
  );
}
