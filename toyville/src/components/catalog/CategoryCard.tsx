import Link from "next/link";
import Image from "next/image";
import { CategoryIcon } from "./CategoryIcon";
import { ChevronRight } from "../icons";

/** Alternância controlada: fundo suave · neutro · fundo suave · neutro… com um detalhe de cor por cartão. */
const TONES: { bg: string; disc: string; dot: string }[] = [
  { bg: "bg-soft-blue", disc: "bg-white/75", dot: "bg-primary" },
  { bg: "bg-white ring-1 ring-inset ring-line", disc: "bg-soft-yellow", dot: "bg-accent" },
  { bg: "bg-soft-yellow", disc: "bg-white/75", dot: "bg-promo" },
  { bg: "bg-white ring-1 ring-inset ring-line", disc: "bg-soft-green", dot: "bg-success" },
  { bg: "bg-soft-green", disc: "bg-white/75", dot: "bg-accent" },
  { bg: "bg-white ring-1 ring-inset ring-line", disc: "bg-soft-blue", dot: "bg-primary" },
];

/**
 * Cartão de categoria com foto "recortada": a imagem fica inteira sobre o fundo do cartão
 * (multiply faz o fundo branco da foto sumir) e sobe um pouco no hover, com sombra no chão.
 * Sem foto: disco tom sobre tom + ícone da categoria.
 */
export function CategoryCard({ c, i, heading = "h3" }: { c: { name: string; slug: string; photoUrl: string | null }; i: number; heading?: "h2" | "h3" }) {
  const t = TONES[i % TONES.length];
  const H = heading;
  return (
    <article className={`group relative flex h-full flex-col overflow-hidden rounded-card transition duration-300 ease-brand hover:-translate-y-1 hover:shadow-lift focus-within:ring-2 focus-within:ring-primary ${t.bg}`}>
      <div className="relative mx-3 mt-3 aspect-[5/4] sm:mx-4 sm:mt-4">
        {c.photoUrl ? (
          <>
            <span aria-hidden className="absolute inset-x-[18%] bottom-[4%] h-[9%] rounded-[50%] bg-ink/15 blur-[6px] transition duration-300 group-hover:scale-90 group-hover:opacity-70" />
            <Image src={c.photoUrl} alt="" fill sizes="(max-width: 639px) 44vw, (max-width: 1023px) 30vw, 280px"
              className="object-contain mix-blend-multiply transition duration-500 ease-brand group-hover:-translate-y-1.5 group-hover:scale-[1.06]" />
          </>
        ) : (
          // Sem foto: disco tom sobre tom + ícone da categoria (substituto discreto, sem inventar imagem).
          <span className={`absolute left-1/2 top-1/2 grid aspect-square h-[82%] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full text-primary transition duration-500 ease-brand group-hover:scale-105 ${t.disc}`}>
            <CategoryIcon slug={c.slug} size={52} />
          </span>
        )}
      </div>
      <div className="flex flex-1 items-end justify-between gap-2 p-3.5 pt-2.5 sm:p-4 sm:pt-3">
        <H className="text-[1.02rem] font-semibold leading-tight sm:text-lg">
          <Link href={`/c/${c.slug}`} className="outline-none after:absolute after:inset-0 after:content-['']">{c.name}</Link>
        </H>
        <span aria-hidden className="grid size-8 shrink-0 place-items-center rounded-full bg-white text-ink shadow-sm transition duration-300 group-hover:bg-primary group-hover:text-white">
          <ChevronRight size={16} />
        </span>
      </div>
      <span aria-hidden className={`absolute right-3.5 top-3.5 size-2.5 rounded-full ${t.dot}`} />
    </article>
  );
}
