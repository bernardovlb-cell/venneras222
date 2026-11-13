/** Elementos decorativos da linguagem "vila dos brinquedos". Todos decorativos (aria-hidden). */

/** Silhueta da vila (casas, castelo e foguete) para o topo do rodapé. Usa currentColor. */
export function Skyline({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 1440 96" preserveAspectRatio="xMidYMax slice" className={className} aria-hidden>
      <path fill="currentColor" d="M0 96V70h40V52l26-20 26 20v18h22V40h18V22l14-12 14 12v18h18v30h30V56l34-28 34 28v14h26V48h16V36h14v12h16v22h40V58l22-18 22 18v12h34V30h12V8l20-8 20 8v22h12v40h28V54l30-24 30 24v16h24V44h20l10-14 10 14h20v26h36V60l18-14 18 14v10h30V34h16V18l14-10 14 10v16h16v36h26V50l28-22 28 22v20h40V58l20-16 20 16v12h28V38h18l12-18 12 18h18v32h34V54l26-20 26 20v16h30V44h16V30h14v14h16v26h36V60l18-14 18 14v10h24H1440V96Z" />
      <path fill="currentColor" d="M1180 70V24q10-22 20 0v46Z" />
      <path fill="currentColor" d="M1172 70l8-16v16Zm36 0-8-16v16Z" />
    </svg>
  );
}
