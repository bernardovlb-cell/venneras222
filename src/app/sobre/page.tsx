import type { Metadata } from "next";
import Link from "next/link";
import { Foto } from "@/components/Foto";
import { existeEmPublic } from "@/lib/assets";

export const metadata: Metadata = {
  title: "Sobre",
  description: "A Venneras é uma curadoria de bolsas femininas do Rio de Janeiro.",
  alternates: { canonical: "/sobre" },
};

// TODO [PREENCHER]: fotos da página Sobre.
const FOTOS = ["/images/sobre/1.jpg", "/images/sobre/2.jpg"];

export default function Sobre() {
  return (
    <div className="mx-auto max-w-[1440px] px-4 pt-14 lg:px-10 lg:pt-20">
      <h1 className="title text-center text-2xl lg:text-3xl">Sobre a Venneras</h1>
      <div className="mt-14 grid items-center gap-10 lg:grid-cols-2 lg:gap-20">
        <Foto src={existeEmPublic(FOTOS[0]) ? FOTOS[0] : null} alt="Venneras — foto da curadoria" sizes="(min-width: 1024px) 50vw, 100vw" />
        <div className="max-w-md space-y-5 leading-relaxed">
          <p className="label text-muted">Curadoria · Rio de Janeiro</p>
          {/* TODO [PREENCHER]: história da curadoria. */}
          <p>[PREENCHER] Como a Venneras começou.</p>
          <p>[PREENCHER] Como as peças são escolhidas.</p>
          <p>
            As peças da coleção são de fabricantes parceiros, como a Grenobil, e a marca de cada uma aparece na página do produto. O que a
            Venneras assina é a seleção.
          </p>
        </div>
      </div>
      <div className="mt-20 grid items-center gap-10 lg:grid-cols-2 lg:gap-20">
        <div className="order-2 max-w-md space-y-5 leading-relaxed lg:order-1 lg:justify-self-end">
          <p>[PREENCHER] Para quem é a Venneras.</p>
          <Link href="/colecao" className="label inline-flex min-h-12 items-center bg-ink px-8 text-paper hover:bg-ink/90">
            Ver coleção
          </Link>
        </div>
        <Foto
          src={existeEmPublic(FOTOS[1]) ? FOTOS[1] : null}
          alt="Venneras — bolsa em uso"
          sizes="(min-width: 1024px) 50vw, 100vw"
          className="order-1 lg:order-2"
        />
      </div>
    </div>
  );
}
