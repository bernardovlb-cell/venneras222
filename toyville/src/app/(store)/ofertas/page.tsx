import type { Metadata } from "next";
import { Catalog, type SP } from "@/components/catalog/Catalog";
import { BoltIcon } from "@/components/icons";

export const metadata: Metadata = { title: "Ofertas e promoções", description: "Brinquedos em promoção na ToyVille." };

export default async function OffersPage({ searchParams }: { searchParams: Promise<SP> }) {
  return (
    <div className="container-tv py-6">
      <h1 className="flex items-center gap-2 text-3xl font-extrabold text-promo sm:text-4xl"><BoltIcon size={30} /> Ofertas</h1>
      <p className="mt-1 text-muted">Somente produtos com desconto real e vigente.</p>
      <div className="mt-6"><Catalog sp={await searchParams} base={{ onSale: true, sort: "discount" }} basePath="/ofertas" /></div>
    </div>
  );
}
