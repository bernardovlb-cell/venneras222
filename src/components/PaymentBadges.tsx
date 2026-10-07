/** Selos simples das formas de pagamento (texto em SVG, sem logos oficiais). */
const formas = ["Pix", "Visa", "Mastercard", "Elo", "Amex"];

export function PaymentBadges({ className = "" }: { className?: string }) {
  return (
    <ul aria-label="Formas de pagamento" className={`flex flex-wrap gap-2 ${className}`}>
      {formas.map((f) => {
        const w = Math.max(48, f.length * 7 + 18);
        return (
        <li key={f}>
          <svg viewBox={`0 0 ${w} 28`} width={w} height={28} role="img" aria-label={f}>
            <rect x="0.5" y="0.5" width={w - 1} height="27" rx="4" fill="none" stroke="currentColor" strokeOpacity="0.35" />
            <text x={w / 2} y="18" textAnchor="middle" fontSize="10" fontFamily="system-ui, sans-serif" fontWeight="600" fill="currentColor">
              {f.toUpperCase()}
            </text>
          </svg>
        </li>
        );
      })}
    </ul>
  );
}
