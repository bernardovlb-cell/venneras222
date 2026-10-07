import type { Metadata } from "next";
import Link from "next/link";
import { Foto } from "@/components/Foto";
import { InstagramIcon } from "@/components/icons";
import { JsonLd } from "@/components/JsonLd";
import { ProductGrid } from "@/components/ProductCard";
import { site } from "@/config/site";
import { produtos } from "@/data/products";
import { existeEmPublic } from "@/lib/assets";

export const metadata: Metadata = { alternates: { canonical: "/" } };

// TODO [PREENCHER]: arquivos de imagem da home.
const HERO = "/images/hero.jpg";
const EDITORIAL = "/images/editorial.jpg";
const INSTAGRAM = [1, 2, 3, 4].map((n) => `/images/instagram/${n}.jpg`);

const confianca = [
  { titulo: "Compra segura", texto: "Checkout Shopify" },
  { titulo: "Pix e cartão", texto: "Via Mercado Pago" },
  { titulo: "Troca em até 7 dias", texto: "Direito de arrependimento" },
  { titulo: "Atendimento", texto: "Pelo WhatsApp" },
];

const organizacao = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: site.nome,
  legalName: site.razaoSocial,
  taxID: site.cnpj,
  url: site.url,
  sameAs: [site.instagramUrl],
  address: { "@type": "PostalAddress", addressLocality: "Rio de Janeiro", addressRegion: "RJ", addressCountry: "BR" },
};

export default function Home() {
  const hero = existeEmPublic(HERO) ? HERO : null;
  const editorial = existeEmPublic(EDITORIAL) ? EDITORIAL : null;

  return (
    <>
      <JsonLd data={organizacao} />

      {/* Primeira tela: 1 foto, 1 título, 1 botão. */}
      <section className="relative flex h-[calc(100svh-150px)] min-h-[520px] items-end bg-[#2a2a28] text-paper lg:h-[calc(100svh-110px)]">
        <Foto
          src={hero}
          alt="Modelo usando bolsa da coleção Venneras"
          sizes="100vw"
          priority
          escura
          proporcao="h-full"
          className="!absolute inset-0"
        />
        <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-ink/60 via-ink/10 to-transparent" />
        <div className="relative mx-auto w-full max-w-[1440px] px-4 pb-14 lg:px-10 lg:pb-20">
          {/* [REVISAR] título provisório */}
          <h1 className="title max-w-2xl text-3xl leading-tight lg:text-5xl">A bolsa certa para o seu dia</h1>
          <Link href="/colecao" className="label mt-8 inline-flex min-h-12 items-center bg-paper px-8 text-ink hover:bg-paper/90">
            Ver coleção
          </Link>
        </div>
      </section>

      <section aria-labelledby="colecao" className="mx-auto max-w-[1440px] px-4 pt-20 lg:px-10 lg:pt-28">
        <h2 id="colecao" className="title mb-10 text-center text-2xl">
          A coleção
        </h2>
        <ProductGrid produtos={produtos} />
      </section>

      <section className="mx-auto mt-24 grid max-w-[1440px] items-center gap-10 px-4 lg:mt-32 lg:grid-cols-2 lg:gap-20 lg:px-10">
        <Foto src={editorial} alt="Bolsa Venneras em uso no dia a dia" sizes="(min-width: 1024px) 50vw, 100vw" />
        <div className="max-w-md">
          <h2 className="title text-2xl">Curadoria Venneras</h2>
          {/* [REVISAR] texto provisório */}
          <p className="mt-6 leading-relaxed text-ink/85">
            Escolhemos poucas peças, pensando no uso de todo dia: o tamanho certo, a alça confortável, o que cabe dentro. Cada bolsa da
            coleção é selecionada por nós antes de chegar até você.
          </p>
          <Link href="/sobre" className="label mt-8 inline-flex min-h-12 items-center border border-ink px-8 hover:bg-ink hover:text-paper">
            Conheça a Venneras
          </Link>
        </div>
      </section>

      <section aria-label="Por que comprar aqui" className="mt-24 border-y border-line lg:mt-32">
        <ul className="mx-auto grid max-w-[1440px] grid-cols-2 gap-y-8 px-4 py-10 lg:grid-cols-4 lg:px-10">
          {confianca.map((c) => (
            <li key={c.titulo} className="text-center">
              <p className="label">{c.titulo}</p>
              <p className="mt-1 text-xs text-muted">{c.texto}</p>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="instagram" className="mx-auto mt-24 max-w-[1440px] px-4 lg:mt-32 lg:px-10">
        <div className="mb-8 flex flex-col items-center gap-2 text-center">
          <h2 id="instagram" className="title text-2xl">
            No Instagram
          </h2>
          <a
            href={site.instagramUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center gap-2 text-sm underline underline-offset-4"
          >
            <InstagramIcon className="size-5" /> {site.instagramHandle}
          </a>
        </div>
        <ul className="grid grid-cols-2 gap-2 lg:grid-cols-4 lg:gap-3">
          {INSTAGRAM.map((src, i) => (
            <li key={src}>
              <a href={site.instagramUrl} target="_blank" rel="noopener noreferrer" className="block hover:opacity-90">
                <Foto
                  src={existeEmPublic(src) ? src : null}
                  alt={`Post ${i + 1} do Instagram ${site.instagramHandle}`}
                  sizes="(min-width: 1024px) 25vw, 50vw"
                  proporcao="aspect-square"
                />
              </a>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
