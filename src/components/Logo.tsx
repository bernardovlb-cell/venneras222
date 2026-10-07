import fs from "node:fs";
import path from "node:path";

/**
 * Logo Venneras com troca automática pelo espaço disponível (container query):
 * - horizontal: a partir de 340px de largura disponível
 * - empilhado:  a partir de 240px
 * - abaixo:     só o ícone da concha
 *
 * Usa os SVGs de public/brand/ quando existirem; senão, placeholder de texto.
 * O componente pai controla a largura disponível.
 */
type Tom = "preto" | "branco";

function temArquivo(nome: string) {
  return fs.existsSync(path.join(process.cwd(), "public", "brand", nome));
}

function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`font-display uppercase leading-none tracking-[var(--tracking-wordmark)] ${className}`}>
      Venneras
    </span>
  );
}

export function Logo({
  tom = "preto",
  forcar,
  className = "",
}: {
  tom?: Tom;
  /** Força uma versão, ignorando o espaço disponível (ex.: rodapé usa "empilhado"). */
  forcar?: "horizontal" | "empilhado" | "icone";
  className?: string;
}) {
  const horizontal = `logo-horizontal-${tom}.svg`;
  const empilhado = `logo-empilhado-${tom}.svg`; // só existe em preto; branco cai no placeholder
  const icone = `icone-concha-${tom}.svg`;

  const vis = (v: "horizontal" | "empilhado" | "icone") => {
    if (forcar) return forcar === v ? "block" : "hidden";
    if (v === "horizontal") return "hidden @min-[340px]:block";
    if (v === "empilhado") return "hidden @min-[240px]:block @min-[340px]:hidden";
    return "block @min-[240px]:hidden";
  };

  return (
    <span className={`@container flex w-full justify-center ${className}`}>
      <span className={vis("horizontal")}>
        {temArquivo(horizontal) ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={`/brand/${horizontal}`} alt="Venneras" className="h-6 w-auto" />
        ) : (
          <Wordmark className="text-[1.6rem]" />
        )}
      </span>
      <span className={vis("empilhado")}>
        {temArquivo(empilhado) ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={`/brand/${empilhado}`} alt="Venneras" className="h-14 w-auto" />
        ) : (
          <Wordmark className="text-xl" />
        )}
      </span>
      <span className={vis("icone")}>
        {temArquivo(icone) ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={`/brand/${icone}`} alt="Venneras" className="h-8 w-auto" />
        ) : (
          <span
            aria-label="Venneras"
            role="img"
            className="font-display flex size-9 items-center justify-center rounded-full border border-current text-lg leading-none"
          >
            V
          </span>
        )}
      </span>
    </span>
  );
}
