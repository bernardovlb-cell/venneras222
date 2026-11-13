import { PuzzleIcon, CarIcon, DiceIcon, TeddyIcon, DollIcon, BottleIcon, BlocksIcon, RobotIcon, BallIcon, RocketIcon, GiftIcon, StarIcon } from "../icons";

const ICONS = { puzzle: PuzzleIcon, car: CarIcon, dice: DiceIcon, teddy: TeddyIcon, doll: DollIcon, bottle: BottleIcon, blocks: BlocksIcon, robot: RobotIcon, ball: BallIcon, rocket: RocketIcon, gift: GiftIcon, star: StarIcon };
type Key = keyof typeof ICONS;

const RULES: [RegExp, Key][] = [
  [/quebra|puzzle/, "puzzle"],
  [/bloco|lego|montar|constru/, "blocks"],
  [/pelucia|urso|bicho/, "teddy"],
  [/carr|pista|veicul|moto|trem/, "car"],
  [/educa|pedag|aprend|ciencia/, "puzzle"],
  [/bonec|casinha|fantoche/, "doll"],
  [/bebe|baby|recem|primeira/, "bottle"],
  [/eletr|robo|tecno|game|video/, "robot"],
  [/jogo|tabuleiro|carta|domino/, "dice"],
  [/esporte|bola|ar-livre|piscina|praia/, "ball"],
  [/espaco|foguete|astro|aventura/, "rocket"],
  [/festa|presente|kit|fantasia/, "gift"],
];

/** Ícone de categoria escolhido pelo slug (categorias novas sem correspondência recebem uma estrela). */
export function categoryIconKey(slug: string): Key {
  for (const [re, k] of RULES) if (re.test(slug)) return k;
  return "star";
}

export function CategoryIcon({ slug, size = 24, className }: { slug: string; size?: number; className?: string }) {
  const key = categoryIconKey(slug);
  if (key === "star") return <StarIcon size={size} className={className} strokeWidth={1.75} filled={false} />;
  const I = ICONS[key];
  return <I size={size} className={className} strokeWidth={1.75} />;
}
