import Link from "next/link";

export default function Home() {
  return (
    <section className="relative flex h-[calc(100svh-150px)] min-h-[520px] items-end bg-[#2a2a28] text-paper lg:h-[calc(100svh-110px)]">
      {/* TODO [PREENCHER]: public/images/hero.jpg · título [REVISAR] */}
      <span className="label absolute inset-0 flex items-center justify-center text-paper/60">Foto pendente</span>
      <div className="relative mx-auto w-full max-w-[1440px] px-4 pb-14 lg:px-10 lg:pb-20">
        <h1 className="title max-w-2xl text-3xl leading-tight lg:text-5xl">A bolsa certa para o seu dia</h1>
        <Link
          href="/colecao"
          className="label mt-8 inline-flex min-h-12 items-center bg-paper px-8 text-ink hover:bg-paper/90"
        >
          Ver coleção
        </Link>
      </div>
    </section>
  );
}
