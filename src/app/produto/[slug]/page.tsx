import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Accordion } from "@/components/Accordion";
import { JsonLd } from "@/components/JsonLd";
import { Preco, PriceLines } from "@/components/PriceBlock";
import { ProductGrid } from "@/components/ProductCard";
import { Gallery } from "@/components/product/Gallery";
import { ProductPurchase } from "@/components/product/ProductPurchase";
import { site } from "@/config/site";
import {
  esgotado,
  imagensOrdenadas,
  nomeCategoria,
  preenchido,
  produtoPorSlug,
  produtos,
  relacionados,
  type Produto,
} from "@/data/products";
import { formatBRL } from "@/lib/format";

export const dynamicParams = false;

export function generateStaticParams() {
  return produtos.map((p) => ({ slug: p.slug }));
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = produtoPorSlug((await params).slug);
  if (!p) return {};
  const img = imagensOrdenadas(p)[0];
  const descricao = preenchido(p.descricaoCurta) ? p.descricaoCurta : `${p.nome} — curadoria Venneras.`;
  return {
    title: p.nome,
    description: descricao,
    alternates: { canonical: `/produto/${p.slug}` },
    openGraph: {
      title: `${p.nome} | Venneras`,
      description: descricao,
      url: `/produto/${p.slug}`,
      images: img ? [{ url: img.src, alt: img.alt }] : undefined,
    },
  };
}

function jsonLdProduto(p: Produto) {
  const imgs = imagensOrdenadas(p).map((i) => new URL(i.src, site.url).toString());
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.nome,
    brand: { "@type": "Brand", name: p.marca },
    ...(imgs.length ? { image: imgs } : {}),
    ...(preenchido(p.descricaoCurta) ? { description: p.descricaoCurta } : {}),
    ...(preenchido(p.material) ? { material: p.material } : {}),
    // Sem preço real não publicamos offers (Google rejeitaria um preço inventado).
    ...(typeof p.preco === "number"
      ? {
          offers: {
            "@type": "Offer",
            url: `${site.url}/produto/${p.slug}`,
            priceCurrency: "BRL",
            price: p.preco.toFixed(2),
            availability: esgotado(p) ? "https://schema.org/OutOfStock" : "https://schema.org/InStock",
            seller: { "@type": "Organization", name: site.nome },
          },
        }
      : {}),
  };
}

function Medidas({ p }: { p: Produto }) {
  const m = p.medidas;
  const linhas = [
    ["Altura", m.alturaCm],
    ["Largura", m.larguraCm],
    ["Profundidade", m.profundidadeCm],
    ["Alça", m.alcaCm],
  ].filter((l): l is [string, number] => preenchido(l[1]));
  if (linhas.length === 0 && !preenchido(m.cabe)) return null;
  return (
    <section aria-labelledby="medidas" className="border-t border-line pt-6">
      <h2 id="medidas" className="label mb-4">
        Medidas
      </h2>
      {linhas.length > 0 && (
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-4">
          {linhas.map(([rotulo, valor]) => (
            <div key={rotulo}>
              <dt className="text-xs text-muted">{rotulo}</dt>
              <dd className="font-medium">{valor.toLocaleString("pt-BR")} cm</dd>
            </div>
          ))}
        </dl>
      )}
      {preenchido(m.cabe) && <p className="mt-4 text-sm">Cabe: {m.cabe}</p>}
    </section>
  );
}

export default async function PaginaProduto({ params }: Props) {
  const p = produtoPorSlug((await params).slug);
  if (!p) notFound();
  const imgs = imagensOrdenadas(p);
  const temMaterial = preenchido(p.material) || preenchido(p.compartimentos) || preenchido(p.cuidados);

  return (
    <>
      <JsonLd data={jsonLdProduto(p)} />
      <div className="mx-auto max-w-[1440px] lg:grid lg:grid-cols-[minmax(0,55fr)_minmax(0,45fr)] lg:gap-12 lg:px-10 lg:pt-8">
        <Gallery imagens={imgs} nome={p.nome} />

        <div className="px-4 pt-6 lg:px-0 lg:pt-0">
          <div className="space-y-6 lg:sticky lg:top-[120px]">
            <header className="space-y-2">
              <p className="label text-muted">{nomeCategoria(p.categoria)}</p>
              <h1 className="title text-2xl leading-tight lg:text-3xl">{p.nome}</h1>
              <p className="text-sm text-muted">Marca: {p.marca}</p>
            </header>

            {typeof p.preco === "number" && (
              <div className="space-y-1">
                <Preco preco={p.preco} precoComparacao={p.precoComparacao} className="text-lg" />
                <PriceLines preco={p.preco} ordem="pix-primeiro" />
              </div>
            )}

            <ProductPurchase produto={p} />

            <Medidas p={p} />

            <div className="border-t border-line">
              {preenchido(p.descricao) && (
                <Accordion titulo="Descrição">
                  <p className="whitespace-pre-line">{p.descricao}</p>
                </Accordion>
              )}
              {temMaterial && (
                <Accordion titulo="Material e cuidados">
                  {preenchido(p.material) && <p>Material: {p.material}</p>}
                  {preenchido(p.compartimentos) && <p>Compartimentos: {p.compartimentos}</p>}
                  {preenchido(p.cuidados) && <p className="whitespace-pre-line">{p.cuidados}</p>}
                </Accordion>
              )}
              <Accordion titulo="Entrega">
                <p>Frete e prazo calculados no checkout pelo CEP.</p>
                {site.freteGratisAcima && <p>Frete grátis acima de {formatBRL(site.freteGratisAcima)}.</p>}
              </Accordion>
              <Accordion titulo="Trocas e devoluções">
                <p>
                  Você pode desistir da compra em até 7 dias após o recebimento (direito de arrependimento, art. 49 do Código de Defesa do
                  Consumidor).
                </p>
                <p>
                  <Link href="/politicas/trocas" className="underline underline-offset-4">
                    Ver política de trocas
                  </Link>
                </p>
              </Accordion>
            </div>
          </div>
        </div>
      </div>

      <section aria-labelledby="relacionados" className="mx-auto mt-24 max-w-[1440px] px-4 lg:px-10">
        <h2 id="relacionados" className="title mb-8 text-xl">
          Você também pode gostar
        </h2>
        <ProductGrid produtos={relacionados(p)} colunasDesktop="lg:grid-cols-3" />
      </section>
    </>
  );
}
