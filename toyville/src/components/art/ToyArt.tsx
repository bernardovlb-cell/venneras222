/**
 * Ilustrações próprias da ToyVille em SVG, no estilo "brinquedo de plástico":
 * faces chapadas (clara/escura), brilho e sombra no chão — a mesma linguagem de volume da logo.
 * Sem gradientes com id (evita conflito quando o mesmo desenho aparece várias vezes na página)
 * e sem hooks, para poder ser usado em componentes de servidor e de cliente.
 */
import type { SVGProps } from "react";

export const C = {
  blue: "#2a5be0", blueL: "#5b86f2", blueD: "#173a9e",
  yellow: "#ffc21a", yellowL: "#ffd968", yellowD: "#df9800",
  red: "#e23b3f", redL: "#f2706f", redD: "#a9181e",
  green: "#38a83c", greenL: "#71cb6c", greenD: "#1f7a26",
  brown: "#c27b3e", brownL: "#e8b07a", brownD: "#8c5225",
  skin: "#f6c69c", skinD: "#e3a477",
  white: "#ffffff", cream: "#fff3d9", creamD: "#ecdcbc",
  ink: "#1b2140", sky: "#cfe6ff",
};

type ArtProps = Omit<SVGProps<SVGSVGElement>, "viewBox"> & { title?: string };

function Svg({ title, children, ...p }: ArtProps & { children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 120 120" role={title ? "img" : undefined} aria-hidden={title ? undefined : true} {...p}>
      {title && <title>{title}</title>}
      {children}
    </svg>
  );
}

const Shadow = ({ cx = 60, cy = 108, rx = 36 }: { cx?: number; cy?: number; rx?: number }) => (
  <ellipse className="tv-ground" cx={cx} cy={cy} rx={rx} ry={rx / 6.5} fill={C.ink} opacity={0.12} />
);

/** Bloco isométrico: topo claro, lateral esquerda média, lateral direita escura. */
export function Iso({ cx, cy, a, h, top, left, right }: { cx: number; cy: number; a: number; h: number; top: string; left: string; right: string }) {
  const b = a / 2;
  return (
    <g>
      <path d={`M${cx - a} ${cy + b}L${cx} ${cy + 2 * b}V${cy + 2 * b + h}L${cx - a} ${cy + b + h}Z`} fill={left} />
      <path d={`M${cx} ${cy + 2 * b}L${cx + a} ${cy + b}V${cy + b + h}L${cx} ${cy + 2 * b + h}Z`} fill={right} />
      <path d={`M${cx} ${cy}L${cx + a} ${cy + b}L${cx} ${cy + 2 * b}L${cx - a} ${cy + b}Z`} fill={top} />
    </g>
  );
}

/** Pino de bloco de montar visto de cima. */
function Stud({ x, y, r, light, mid, dark }: { x: number; y: number; r: number; light: string; mid: string; dark: string }) {
  return (
    <g>
      <ellipse cx={x} cy={y + 3} rx={r} ry={r / 2} fill={dark} />
      <rect x={x - r} y={y} width={r * 2} height={3} fill={mid} />
      <ellipse cx={x} cy={y} rx={r} ry={r / 2} fill={light} />
    </g>
  );
}

/** Esfera com borda sombreada (círculo escuro + círculo claro deslocado) e brilho. */
function Ball3D({ cx, cy, r, base, dark, glint = true }: { cx: number; cy: number; r: number; base: string; dark: string; glint?: boolean }) {
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill={dark} />
      <circle cx={cx - r * 0.1} cy={cy - r * 0.1} r={r * 0.88} fill={base} />
      {glint && <ellipse cx={cx - r * 0.38} cy={cy - r * 0.42} rx={r * 0.24} ry={r * 0.15} fill="#fff" opacity={0.55} transform={`rotate(-35 ${cx - r * 0.38} ${cy - r * 0.42})`} />}
    </g>
  );
}

const Glint = ({ x, y, w = 8, h = 4, rot = -30 }: { x: number; y: number; w?: number; h?: number; rot?: number }) => (
  <ellipse cx={x} cy={y} rx={w} ry={h} fill="#fff" opacity={0.5} transform={`rotate(${rot} ${x} ${y})`} />
);

export function Sparkle({ x, y, s = 8, fill = C.yellow, className }: { x: number; y: number; s?: number; fill?: string; className?: string }) {
  return <path className={className} d={`M${x} ${y - s}Q${x + s * 0.18} ${y - s * 0.18} ${x + s} ${y}Q${x + s * 0.18} ${y + s * 0.18} ${x} ${y + s}Q${x - s * 0.18} ${y + s * 0.18} ${x - s} ${y}Q${x - s * 0.18} ${y - s * 0.18} ${x} ${y - s}Z`} fill={fill} />;
}

/* ---------------------------------------------------------------- brinquedos */

export function BlocksArt(p: ArtProps) {
  return (
    <Svg {...p}>
      <Shadow rx={42} />
      <Iso cx={62} cy={56} a={30} h={18} top={C.blueL} left={C.blue} right={C.blueD} />
      <Stud x={44} y={69} r={5.5} light={C.blueL} mid={C.blue} dark={C.blueD} />
      <Stud x={80} y={69} r={5.5} light={C.blueL} mid={C.blue} dark={C.blueD} />
      <Iso cx={62} cy={44} a={20} h={15} top={C.yellowL} left={C.yellow} right={C.yellowD} />
      <Stud x={54} y={52} r={4.5} light={C.yellowL} mid={C.yellow} dark={C.yellowD} />
      <Stud x={70} y={52} r={4.5} light={C.yellowL} mid={C.yellow} dark={C.yellowD} />
      <Iso cx={28} cy={80} a={14} h={13} top={C.redL} left={C.red} right={C.redD} />
      <Stud x={28} y={86} r={4} light={C.redL} mid={C.red} dark={C.redD} />
      <Iso cx={98} cy={88} a={10} h={9} top={C.greenL} left={C.green} right={C.greenD} />
    </Svg>
  );
}

export function DiceArt(p: ArtProps) {
  return (
    <Svg {...p}>
      <Shadow cx={62} rx={42} />
      <Iso cx={50} cy={36} a={28} h={30} top={C.white} left={C.cream} right={C.creamD} />
      <g transform="matrix(28 -14 28 14 22 50)"><circle cx={0.5} cy={0.5} r={0.11} fill={C.red} /></g>
      <g transform="matrix(28 14 0 30 22 50)"><circle cx={0.3} cy={0.3} r={0.11} fill={C.blue} /><circle cx={0.7} cy={0.7} r={0.11} fill={C.blue} /></g>
      <g transform="matrix(28 -14 0 30 50 64)"><circle cx={0.25} cy={0.25} r={0.1} fill={C.ink} /><circle cx={0.5} cy={0.5} r={0.1} fill={C.ink} /><circle cx={0.75} cy={0.75} r={0.1} fill={C.ink} /></g>
      <ellipse cx={96} cy={102} rx={13} ry={4.5} fill={C.greenD} />
      <path d="M83 101Q83 93 89 91L91 77Q96 74 101 77L103 91Q109 93 109 101Z" fill={C.green} />
      <path d="M96 75Q101 76 101 77L103 91Q109 93 109 101L99 101Z" fill={C.greenD} opacity={0.5} />
      <Ball3D cx={96} cy={70} r={9} base={C.greenL} dark={C.greenD} />
    </Svg>
  );
}

export function TeddyArt(p: ArtProps) {
  return (
    <Svg {...p}>
      <Shadow rx={34} />
      <ellipse cx={45} cy={105} rx={10} ry={6.5} fill={C.brownD} />
      <ellipse cx={75} cy={105} rx={10} ry={6.5} fill={C.brownD} />
      <ellipse cx={45} cy={103.5} rx={8.5} ry={5} fill={C.brownL} />
      <ellipse cx={75} cy={103.5} rx={8.5} ry={5} fill={C.brownL} />
      <Ball3D cx={60} cy={88} r={22} base={C.brown} dark={C.brownD} glint={false} />
      <ellipse cx={60} cy={92} rx={11} ry={10} fill={C.brownL} />
      <ellipse cx={37} cy={84} rx={7} ry={11} fill={C.brownD} transform="rotate(30 37 84)" />
      <ellipse cx={83} cy={84} rx={7} ry={11} fill={C.brown} transform="rotate(-30 83 84)" />
      <Ball3D cx={37} cy={30} r={11} base={C.brown} dark={C.brownD} glint={false} />
      <Ball3D cx={83} cy={30} r={11} base={C.brown} dark={C.brownD} glint={false} />
      <circle cx={37} cy={30} r={5.5} fill={C.brownL} />
      <circle cx={83} cy={30} r={5.5} fill={C.brownL} />
      <Ball3D cx={60} cy={50} r={27} base={C.brown} dark={C.brownD} />
      <ellipse cx={60} cy={61} rx={12.5} ry={9.5} fill={C.brownL} />
      <ellipse cx={60} cy={56.5} rx={4.6} ry={3.2} fill={C.ink} />
      <path d="M60 60v3.5M55.5 64q4.5 3 9 0" stroke={C.ink} strokeWidth={1.8} fill="none" strokeLinecap="round" />
      <circle cx={49.5} cy={46} r={3.2} fill={C.ink} /><circle cx={70.5} cy={46} r={3.2} fill={C.ink} />
      <circle cx={48.5} cy={45} r={1} fill="#fff" /><circle cx={69.5} cy={45} r={1} fill="#fff" />
      <path d="M47 73l13 4-13 5zM73 73l-13 4 13 5z" fill={C.red} />
      <circle cx={60} cy={77} r={3.6} fill={C.redD} />
    </Svg>
  );
}

export function CarArt(p: ArtProps) {
  const body = "M14 82Q14 70 26 68L38 66L49 50Q52 46 57 46L80 46Q86 46 89 51L98 66L105 68Q111 70 111 80L111 86Q111 90 107 90L18 90Q14 90 14 86Z";
  return (
    <Svg {...p}>
      <Shadow cx={62} cy={104} rx={46} />
      <path d={body} fill={C.redD} />
      <path d="M14 80Q14 70 26 68L38 66L49 50Q52 46 57 46L80 46Q86 46 89 51L98 66L105 68Q111 70 111 78L111 81L14 81Z" fill={C.red} />
      <path d="M52 52H67V64H45Z" fill={C.sky} />
      <path d="M71 52H83Q86 52 87 54L93 64H71Z" fill={C.sky} />
      <path d="M55 54l-4 8M76 54l-4 8" stroke="#fff" strokeWidth={2.5} strokeLinecap="round" opacity={0.8} />
      <rect x={20} y={72} width={86} height={4} rx={2} fill={C.yellow} />
      <ellipse cx={107} cy={75} rx={3.2} ry={4} fill={C.yellowL} />
      <Glint x={34} y={70} w={7} h={2.4} rot={-8} />
      {[36, 89].map((x) => (
        <g key={x}>
          <circle cx={x} cy={90} r={13} fill={C.ink} />
          <circle cx={x} cy={90} r={6} fill="#d8deeb" />
          <circle cx={x} cy={90} r={2.4} fill={C.ink} />
        </g>
      ))}
    </Svg>
  );
}

const PUZZLE = "M0 0H14C14 -7 26 -7 26 0H40V14C47 14 47 26 40 26V40H0Z";
export function PuzzleArt(p: ArtProps) {
  return (
    <Svg {...p}>
      <Shadow cx={58} rx={40} />
      <g transform="translate(18 50) rotate(-10)">
        <path d={PUZZLE} fill={C.greenD} transform="translate(0 7)" />
        <path d={PUZZLE} fill={C.green} />
        <Glint x={10} y={8} w={6} h={2.5} />
      </g>
      <g transform="translate(62 40) rotate(12)">
        <path d={PUZZLE} fill={C.blueD} transform="translate(0 7)" />
        <path d={PUZZLE} fill={C.blue} />
        <Glint x={10} y={8} w={6} h={2.5} />
      </g>
      <g transform="translate(80 16) rotate(16) scale(.42)">
        <path d={PUZZLE} fill={C.yellowD} transform="translate(0 8)" />
        <path d={PUZZLE} fill={C.yellow} />
      </g>
      <Sparkle x={26} y={30} s={7} fill={C.red} />
    </Svg>
  );
}

export function DollArt(p: ArtProps) {
  return (
    <Svg {...p}>
      <Shadow rx={30} />
      <rect x={50} y={92} width={7} height={12} rx={3} fill={C.skin} />
      <rect x={63} y={92} width={7} height={12} rx={3} fill={C.skinD} />
      <ellipse cx={53} cy={105} rx={6} ry={3.5} fill={C.ink} />
      <ellipse cx={67} cy={105} rx={6} ry={3.5} fill={C.ink} />
      <ellipse cx={40} cy={76} rx={5} ry={10} fill={C.skin} transform="rotate(22 40 76)" />
      <ellipse cx={80} cy={76} rx={5} ry={10} fill={C.skinD} transform="rotate(-22 80 76)" />
      <path d="M46 60H74L88 96Q60 104 32 96Z" fill={C.red} />
      <path d="M60 60H74L88 96Q74 100 60 101Z" fill={C.redD} opacity={0.55} />
      <path d="M48 60Q60 70 72 60Z" fill="#fff" />
      <circle cx={60} cy={76} r={2.4} fill={C.yellow} /><circle cx={60} cy={85} r={2.4} fill={C.yellow} />
      <circle cx={38} cy={38} r={9} fill={C.brownD} />
      <circle cx={82} cy={38} r={9} fill={C.brownD} />
      <path d="M33 28l-6-5v10zM87 28l6-5v10z" fill={C.blue} />
      <Ball3D cx={60} cy={40} r={20} base={C.skin} dark={C.skinD} glint={false} />
      <path d="M40 38Q41 18 60 18Q79 18 80 38Q72 28 60 30Q50 28 40 38Z" fill={C.brown} />
      <circle cx={52} cy={42} r={2.6} fill={C.ink} /><circle cx={68} cy={42} r={2.6} fill={C.ink} />
      <circle cx={47} cy={49} r={3.5} fill={C.redL} opacity={0.5} /><circle cx={73} cy={49} r={3.5} fill={C.redL} opacity={0.5} />
      <path d="M55 50q5 4 10 0" stroke={C.ink} strokeWidth={1.8} fill="none" strokeLinecap="round" />
    </Svg>
  );
}

export function RattleArt(p: ArtProps) {
  return (
    <Svg {...p}>
      <Shadow cx={64} rx={36} />
      <g transform="rotate(-40 50 46)">
        <rect x={44} y={62} width={12} height={40} rx={6} fill={C.blue} />
        <rect x={50} y={62} width={6} height={40} rx={3} fill={C.blueD} opacity={0.55} />
        <Ball3D cx={50} cy={106} r={10} base={C.green} dark={C.greenD} />
        <rect x={42} y={64} width={16} height={6} rx={3} fill={C.yellowD} />
      </g>
      <Ball3D cx={50} cy={46} r={27} base={C.yellow} dark={C.yellowD} />
      <circle cx={42} cy={58} r={4.5} fill={C.red} />
      <circle cx={62} cy={36} r={4.5} fill={C.blue} />
      <circle cx={63} cy={56} r={3.5} fill={C.green} />
      <circle cx={38} cy={40} r={3} fill={C.redL} />
      <Sparkle x={98} y={22} s={7} fill={C.blueL} />
    </Svg>
  );
}

export function RobotArt(p: ArtProps) {
  return (
    <Svg {...p}>
      <Shadow rx={32} />
      <path d="M60 22V10" stroke={C.ink} strokeWidth={3} strokeLinecap="round" />
      <Ball3D cx={60} cy={9} r={6} base={C.red} dark={C.redD} />
      <rect x={28} y={34} width={8} height={16} rx={4} fill={C.redD} />
      <rect x={84} y={34} width={8} height={16} rx={4} fill={C.redD} />
      <rect x={32} y={22} width={56} height={42} rx={14} fill={C.blueD} />
      <rect x={32} y={20} width={52} height={40} rx={13} fill={C.blue} />
      <rect x={40} y={29} width={36} height={22} rx={8} fill={C.ink} />
      <circle cx={51} cy={40} r={4.5} fill={C.yellow} /><circle cx={65} cy={40} r={4.5} fill={C.yellow} />
      <path d="M53 47h10" stroke={C.greenL} strokeWidth={2} strokeLinecap="round" />
      <Glint x={42} y={25} w={6} h={2.2} rot={-10} />
      <rect x={24} y={70} width={10} height={24} rx={5} fill={C.blueD} transform="rotate(14 29 82)" />
      <rect x={86} y={70} width={10} height={24} rx={5} fill={C.blueD} transform="rotate(-14 91 82)" />
      <rect x={38} y={68} width={44} height={34} rx={11} fill={C.blueD} />
      <rect x={38} y={66} width={41} height={33} rx={10} fill={C.blueL} />
      <Ball3D cx={58} cy={82} r={7} base={C.greenL} dark={C.greenD} />
      <rect x={68} y={76} width={6} height={3} rx={1.5} fill={C.yellow} />
      <rect x={68} y={83} width={6} height={3} rx={1.5} fill={C.red} />
      <rect x={44} y={100} width={10} height={6} rx={3} fill={C.ink} />
      <rect x={64} y={100} width={10} height={6} rx={3} fill={C.ink} />
    </Svg>
  );
}

export function RocketArt(p: ArtProps) {
  return (
    <Svg {...p}>
      <Shadow rx={22} />
      <g className="tv-flame" style={{ transformOrigin: "60px 84px" }}>
        <path d="M49 82Q60 116 71 82Z" fill={C.yellow} />
        <path d="M54 82Q60 102 66 82Z" fill={C.red} />
      </g>
      <path d="M44 58L28 82L44 78Z" fill={C.redD} />
      <path d="M76 58L92 82L76 78Z" fill={C.red} />
      <path d="M60 10C76 23 80 44 77 82H43C40 44 44 23 60 10Z" fill={C.white} />
      <path d="M60 10C76 23 80 44 77 82H62C64 50 64 26 60 10Z" fill={C.creamD} />
      <path d="M60 10C67 16 72 25 74 34H46C48 25 53 16 60 10Z" fill={C.red} />
      <path d="M60 10C67 16 72 25 74 34H63C63 26 62 17 60 10Z" fill={C.redD} />
      <circle cx={60} cy={52} r={11} fill={C.creamD} />
      <Ball3D cx={60} cy={52} r={8} base={C.blueL} dark={C.blueD} />
      <rect x={56} y={70} width={8} height={18} rx={4} fill={C.blue} />
    </Svg>
  );
}

export function GiftArt(p: ArtProps) {
  return (
    <Svg {...p}>
      <Shadow rx={40} />
      <Iso cx={60} cy={40} a={34} h={40} top={C.redL} left={C.red} right={C.redD} />
      <g transform="matrix(34 17 0 40 26 57)"><rect x={0.42} y={0} width={0.16} height={1} fill={C.yellow} /></g>
      <g transform="matrix(34 -17 0 40 60 74)"><rect x={0.42} y={0} width={0.16} height={1} fill={C.yellowD} /></g>
      <g transform="matrix(34 -17 34 17 26 57)"><rect x={0.42} y={0} width={0.16} height={1} fill={C.yellowL} /><rect x={0} y={0.42} width={1} height={0.16} fill={C.yellowL} /></g>
      <path d="M60 57C48 40 34 46 44 54Q50 58 60 57Z" fill={C.yellow} />
      <path d="M60 57C72 40 86 46 76 54Q70 58 60 57Z" fill={C.yellowD} />
      <circle cx={60} cy={56} r={4.5} fill={C.yellowD} />
      <Sparkle x={100} y={24} s={7} />
      <Sparkle x={20} y={36} s={5} fill={C.blueL} />
    </Svg>
  );
}

export function BallArt(p: ArtProps) {
  return (
    <Svg {...p}>
      <Shadow rx={30} />
      <circle cx={60} cy={62} r={38} fill={C.creamD} />
      <circle cx={57} cy={59} r={35} fill={C.white} />
      <path d="M60 24A38 38 0 0 1 96 50Q78 46 64 56Q62 40 60 24Z" fill={C.red} />
      <path d="M98 64A38 38 0 0 1 72 98Q74 80 64 66Q82 60 98 64Z" fill={C.blue} />
      <path d="M58 100A38 38 0 0 1 24 76Q42 76 54 66Q60 82 58 100Z" fill={C.yellow} />
      <path d="M22 62A38 38 0 0 1 44 27Q46 46 56 58Q38 64 22 62Z" fill={C.green} />
      <circle cx={60} cy={62} r={7} fill={C.white} />
      <Glint x={44} y={40} w={9} h={4} rot={-40} />
    </Svg>
  );
}

/* ------------------------------------------------------------ mapeamentos */

export const ARTS = { blocks: BlocksArt, dice: DiceArt, teddy: TeddyArt, car: CarArt, puzzle: PuzzleArt, doll: DollArt, rattle: RattleArt, robot: RobotArt, rocket: RocketArt, gift: GiftArt, ball: BallArt };
export type ArtKey = keyof typeof ARTS;

const RULES: [RegExp, ArtKey][] = [
  [/quebra|puzzle/, "puzzle"],
  [/bloco|lego|montar|constru/, "blocks"],
  [/pelucia|urso|bicho/, "teddy"],
  [/carr|pista|veicul|moto|trem/, "car"],
  [/educa|pedag|aprend|ciencia/, "puzzle"],
  [/bonec|casinha|fantoche/, "doll"],
  [/bebe|baby|recem|primeira/, "rattle"],
  [/eletr|robo|tecno|game|video/, "robot"],
  [/jogo|tabuleiro|carta|domino/, "dice"],
  [/esporte|bola|ar-livre|piscina|praia/, "ball"],
  [/espaco|foguete|astro|aventura/, "rocket"],
  [/festa|presente|kit|fantasia/, "gift"],
];
const FALLBACK: ArtKey[] = ["rocket", "gift", "ball", "blocks"];

export function artKeyFor(slug: string): ArtKey {
  for (const [re, k] of RULES) if (re.test(slug)) return k;
  let h = 0;
  for (const ch of slug) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return FALLBACK[h % FALLBACK.length];
}

/**
 * Ilustração como arquivo estático (public/art/<chave>.svg, gerado por `npm run art`).
 * Fica em cache entre páginas e não pesa no HTML — use esta forma nas ilustrações repetidas.
 * As versões em linha (TeddyArt etc.) ficam para a cena animada do hero.
 */
export function ToyArt({ art, className, alt = "" }: { art: ArtKey; className?: string; alt?: string }) {
  // eslint-disable-next-line @next/next/no-img-element -- SVG próprio e estático: não passa pelo otimizador de imagens
  return <img src={`/art/${art}.svg`} alt={alt} width={120} height={120} loading="lazy" decoding="async" draggable={false} className={className} />;
}

/** Ilustração de uma categoria (pelo slug). Fotos enviadas no painel têm prioridade — ver CategoryHouse. */
export function CategoryArt({ slug, className }: { slug: string; className?: string }) {
  return <ToyArt art={artKeyFor(slug)} className={className} />;
}

/** Ilustração por faixa etária (guia de presentes). */
export const AGE_ART: Record<string, ArtKey> = { "0-12m": "rattle", "1-2": "blocks", "3-4": "teddy", "5-7": "car", "8-11": "robot", "12+": "dice" };
