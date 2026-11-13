/**
 * Formas abstratas da marca (círculo, arco, bloco, pílula) nas cores da ToyVille.
 * Usadas como substituto elegante onde ainda não há fotografia e como profundidade atrás de fotos
 * recortadas. São geométricas de propósito: não representam produtos nem personagens.
 * Sempre decorativas (aria-hidden) e sem gradientes/ids, então podem repetir na página.
 */

export type ShapeTheme = "blue" | "yellow" | "red" | "green" | "cream" | "soft-blue" | "soft-yellow" | "soft-green" | "white";

type Palette = { big: string; arch: string; block: string; dot: string; pill: string };

const P = { primary: "var(--tv-primary)", dark: "var(--tv-primary-dark)", accent: "var(--tv-accent)", promo: "var(--tv-promo)", success: "var(--tv-success)", white: "#ffffff", sky: "#8fb0ff", mint: "#9ad79a", butter: "#ffe28a", rose: "#f6a5a7" };

/** Paleta de formas para cada cor de fundo (evita forma da mesma cor do fundo). */
const PALETTES: Record<ShapeTheme, Palette> = {
  blue: { big: P.accent, arch: P.white, block: P.promo, dot: P.mint, pill: P.sky },
  yellow: { big: P.primary, arch: P.white, block: P.promo, dot: P.success, pill: P.butter },
  red: { big: P.accent, arch: P.white, block: P.dark, dot: P.rose, pill: P.rose },
  green: { big: P.accent, arch: P.white, block: P.primary, dot: P.mint, pill: P.mint },
  cream: { big: P.accent, arch: P.primary, block: P.promo, dot: P.success, pill: P.sky },
  "soft-blue": { big: P.primary, arch: P.accent, block: P.promo, dot: P.success, pill: P.sky },
  "soft-yellow": { big: P.accent, arch: P.primary, block: P.success, dot: P.promo, pill: P.butter },
  "soft-green": { big: P.success, arch: P.accent, block: P.primary, dot: P.promo, pill: P.mint },
  white: { big: P.accent, arch: P.primary, block: P.success, dot: P.promo, pill: P.sky },
};

/** Versões tom sobre tom (uma cor de destaque só): banners secundários e cartões, onde o colorido competiria com o conteúdo. */
const MONO: Partial<Record<ShapeTheme, Palette>> = {
  "soft-blue": { big: "#d3dffc", arch: P.primary, block: P.white, dot: P.accent, pill: "#bccdf8" },
  "soft-yellow": { big: "#ffe9a3", arch: P.accent, block: P.white, dot: P.primary, pill: "#ffdf80" },
  "soft-green": { big: "#cfeacf", arch: P.success, block: P.white, dot: P.accent, pill: "#b5ddb5" },
  white: { big: "#e6edff", arch: P.primary, block: "#fff1c2", dot: P.promo, pill: "#d3dffc" },
};

const ARCH = (cx: number, base: number, r: number) => `M${cx - r} ${base}A${r} ${r} 0 0 1 ${cx + r} ${base}H${cx + r / 2}A${r / 2} ${r / 2} 0 0 0 ${cx - r / 2} ${base}Z`;

/** Composição grande (banner principal sem foto): blocos geométricos empilhados. */
export function ShapesHero({ theme = "blue", className = "" }: { theme?: ShapeTheme; className?: string }) {
  const c = PALETTES[theme];
  return (
    <svg viewBox="0 0 480 400" className={className} aria-hidden preserveAspectRatio="xMidYMid meet">
      <circle cx={292} cy={176} r={132} fill={c.big} />
      <rect x={58} y={150} width={170} height={58} rx={29} fill={c.pill} transform="rotate(-16 143 179)" />
      <rect x={276} y={212} width={128} height={128} rx={26} fill={c.block} transform="rotate(10 340 276)" />
      <path d={ARCH(170, 352, 104)} fill={c.arch} />
      <circle cx={120} cy={92} r={30} fill={c.dot} />
      <circle cx={408} cy={70} r={14} fill={c.arch} />
    </svg>
  );
}

/** Fundo de profundidade atrás de uma foto recortada: só o círculo e a pílula. */
export function ShapesBackdrop({ theme = "blue", className = "" }: { theme?: ShapeTheme; className?: string }) {
  const c = PALETTES[theme];
  return (
    <svg viewBox="0 0 480 400" className={className} aria-hidden preserveAspectRatio="xMidYMid meet">
      <circle cx={250} cy={200} r={168} fill={c.big} />
      <rect x={30} y={270} width={150} height={52} rx={26} fill={c.pill} transform="rotate(-14 105 296)" />
      <circle cx={420} cy={80} r={18} fill={c.dot} />
    </svg>
  );
}

/** Composição compacta (banners secundários, guia, encerramento). `variant` muda o arranjo. */
export function ShapesCompact({ theme = "soft-blue", variant = 0, mono = false, className = "" }: { theme?: ShapeTheme; variant?: number; mono?: boolean; className?: string }) {
  const c = (mono && MONO[theme]) || PALETTES[theme];
  const v = ((variant % 3) + 3) % 3;
  return (
    <svg viewBox="0 0 240 200" className={className} aria-hidden preserveAspectRatio="xMidYMid meet">
      {v === 0 && (<>
        <circle cx={140} cy={96} r={70} fill={c.big} />
        <path d={ARCH(86, 186, 58)} fill={c.arch} />
        <rect x={150} y={118} width={62} height={62} rx={14} fill={c.block} transform="rotate(12 181 149)" />
        <circle cx={60} cy={52} r={14} fill={c.dot} />
      </>)}
      {v === 1 && (<>
        <path d={ARCH(128, 176, 86)} fill={c.big} />
        <circle cx={128} cy={70} r={38} fill={c.arch} />
        <rect x={22} y={126} width={84} height={30} rx={15} fill={c.pill} transform="rotate(-18 64 141)" />
        <circle cx={206} cy={56} r={12} fill={c.dot} />
      </>)}
      {v === 2 && (<>
        <rect x={84} y={62} width={104} height={104} rx={24} fill={c.big} transform="rotate(-8 136 114)" />
        <circle cx={176} cy={72} r={36} fill={c.arch} />
        <path d={ARCH(70, 186, 46)} fill={c.block} />
        <circle cx={40} cy={70} r={11} fill={c.dot} />
      </>)}
    </svg>
  );
}

/** Fileira de blocos apoiados no chão (encerramento da home): composição própria, diferente do banner. */
export function ShapesRow({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 560 240" className={className} aria-hidden preserveAspectRatio="xMidYMax meet">
      <path d={ARCH(96, 240, 96)} fill={P.primary} />
      <rect x={200} y={128} width={112} height={112} rx={24} fill={P.success} />
      <circle cx={256} cy={84} r={44} fill={P.promo} />
      <circle cx={404} cy={160} r={80} fill={P.accent} />
      <rect x={496} y={96} width={52} height={144} rx={26} fill={P.sky} />
      <circle cx={522} cy={56} r={16} fill={P.primary} />
    </svg>
  );
}
