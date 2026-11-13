import { C, Sparkle, TeddyArt, BlocksArt, RocketArt, BallArt } from "./ToyArt";

/** Torre cilíndrica com telhado cônico e bandeira. */
function Tower({ cx, top, w, roofH, flag }: { cx: number; top: number; w: number; roofH: number; flag: string }) {
  const x = cx - w / 2;
  const r = w / 2;
  return (
    <g>
      <rect x={x} y={top} width={w} height={400 - top} fill={C.blueL} />
      <rect x={cx + w * 0.15} y={top} width={w * 0.35} height={400 - top} fill={C.blue} />
      <ellipse cx={cx} cy={400} rx={r} ry={8} fill={C.blue} />
      <path d={`M${x - 6} ${top + 2}L${cx} ${top - roofH}L${x + w + 6} ${top + 2}Q${cx} ${top + 18} ${x - 6} ${top + 2}Z`} fill={C.red} />
      <path d={`M${cx} ${top - roofH}L${x + w + 6} ${top + 2}Q${cx + r * 0.6} ${top + 12} ${cx} ${top + 11}Z`} fill={C.redD} />
      <path d={`M${cx} ${top - roofH}V${top - roofH - 26}`} stroke={C.ink} strokeWidth={3} strokeLinecap="round" />
      <path className="tv-flag" d={`M${cx + 1} ${top - roofH - 26}l24 7-24 7Z`} fill={flag} />
      <path d={`M${cx - 7} ${top + 70}v-12a7 7 0 0 1 14 0v12Z`} fill={C.yellowL} />
      <path d={`M${cx - 7} ${top + 70}v-12a7 7 0 0 1 7-7v19Z`} fill={C.yellow} />
    </g>
  );
}

function Cloud({ x, y, s = 1, className }: { x: number; y: number; s?: number; className?: string }) {
  const parts = (dy: number, fill: string) => (
    <g fill={fill} transform={`translate(0 ${dy})`}>
      <ellipse cx={x + 30 * s} cy={y + 8 * s} rx={46 * s} ry={14 * s} />
      <circle cx={x + 8 * s} cy={y} r={18 * s} />
      <circle cx={x + 32 * s} cy={y - 10 * s} r={24 * s} />
      <circle cx={x + 56 * s} cy={y} r={17 * s} />
    </g>
  );
  return <g className={className}>{parts(5, "#dfe9fb")}{parts(0, "#fff")}</g>;
}

function Balloon({ x, y, fill, dark, className }: { x: number; y: number; fill: string; dark: string; className?: string }) {
  return (
    <g className={className}>
      <path d={`M${x} ${y + 30}q-6 24 4 46`} stroke={C.ink} strokeWidth={1.6} fill="none" opacity={0.45} />
      <ellipse cx={x} cy={y} rx={20} ry={24} fill={dark} />
      <ellipse cx={x - 2} cy={y - 2} rx={17.5} ry={21.5} fill={fill} />
      <path d={`M${x - 4} ${y + 23}h8l-4 6Z`} fill={dark} />
      <ellipse cx={x - 8} cy={y - 10} rx={5} ry={8} fill="#fff" opacity={0.5} transform={`rotate(25 ${x - 8} ${y - 10})`} />
    </g>
  );
}

/**
 * Cena principal da home: a "vila" da ToyVille — castelo, foguete, ursinho, blocos e balões —
 * desenhada do zero na mesma linguagem tridimensional da logo. Decorativa (aria-hidden).
 */
export function HeroScene({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 560 470" className={`tv-scene ${className}`} aria-hidden>
      <circle cx={290} cy={240} r={206} fill="#fff0c2" />
      <circle cx={290} cy={240} r={228} fill="none" stroke={C.blueL} strokeWidth={2.5} strokeDasharray="2 12" strokeLinecap="round" opacity={0.55} />
      <Cloud x={70} y={118} s={0.9} className="tv-drift" />
      <Cloud x={420} y={70} s={0.75} className="tv-drift tv-delay-2" />

      <path d="M120 330C150 230 300 190 420 210" stroke={C.blueL} strokeWidth={3} strokeDasharray="1 11" strokeLinecap="round" fill="none" opacity={0.7} />

      {/* morro */}
      <ellipse cx={290} cy={408} rx={232} ry={42} fill={C.greenD} />
      <ellipse cx={290} cy={400} rx={228} ry={37} fill={C.green} />
      <ellipse cx={230} cy={392} rx={130} ry={13} fill={C.greenL} opacity={0.55} />

      {/* castelo: torre central (fundo) */}
      <rect x={254} y={196} width={72} height={204} fill={C.yellow} />
      <rect x={300} y={196} width={26} height={204} fill={C.yellowD} />
      <path d="M244 200L290 104L336 200Q290 218 244 200Z" fill={C.red} />
      <path d="M290 104L336 200Q312 210 290 211Z" fill={C.redD} />
      <path d="M290 104V74" stroke={C.ink} strokeWidth={3} strokeLinecap="round" />
      <path className="tv-flag" d="M291 74l28 8-28 8Z" fill={C.green} />
      <path d="M290 218l5.4 11 12.1 1.8-8.8 8.5 2.1 12-10.8-5.7-10.8 5.7 2.1-12-8.8-8.5 12.1-1.8Z" fill={C.blue} />

      {/* muralha */}
      <path d="M380 268L402 256V388L380 400Z" fill={C.blueD} />
      <rect x={198} y={268} width={182} height={132} fill={C.blue} />
      {[198, 228, 258, 288, 318, 348].map((x) => <rect key={x} x={x} y={252} width={20} height={18} fill={C.blue} />)}
      {[198, 228, 258, 288, 318, 348].map((x) => <rect key={`s${x}`} x={x + 14} y={252} width={6} height={18} fill={C.blueD} />)}
      <path d="M220 330v-14a9 9 0 0 1 18 0v14Z" fill={C.yellowL} />
      <path d="M340 330v-14a9 9 0 0 1 18 0v14Z" fill={C.yellowL} />
      <path d="M260 400V356a30 30 0 0 1 60 0V400Z" fill={C.yellow} />
      <path d="M267 400V357a23 23 0 0 1 46 0V400Z" fill="#8a5426" />
      <path d="M282 400V336M298 400V336" stroke="#6c3f1a" strokeWidth={3} />
      <circle cx={306} cy={372} r={3} fill={C.yellow} />

      <Tower cx={188} top={226} w={60} roofH={80} flag={C.yellow} />
      <Tower cx={398} top={240} w={56} roofH={72} flag={C.red} />

      {/* foguete */}
      <g className="tv-float no-ground">
        <g transform="translate(440 120) rotate(24 60 60)"><RocketArt x={0} y={0} width={120} height={120} /></g>
      </g>

      <g className="tv-float tv-delay-1"><Balloon x={88} y={210} fill={C.red} dark={C.redD} /></g>
      <g className="tv-float tv-delay-3"><Balloon x={124} y={186} fill={C.blueL} dark={C.blue} /></g>

      <TeddyArt x={64} y={286} width={140} height={140} />
      <BlocksArt x={392} y={312} width={128} height={128} />
      <BallArt x={196} y={378} width={74} height={74} />

      <Sparkle x={420} y={210} s={11} className="tv-twinkle" />
      <Sparkle x={150} y={84} s={9} fill={C.red} className="tv-twinkle tv-delay-2" />
      <Sparkle x={520} y={300} s={8} fill={C.green} className="tv-twinkle tv-delay-1" />
      <Sparkle x={236} y={150} s={7} fill={C.blueL} className="tv-twinkle tv-delay-3" />
      <Sparkle x={40} y={250} s={6} className="tv-twinkle tv-delay-1" />
    </svg>
  );
}
