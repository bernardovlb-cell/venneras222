import Image from "next/image";

/** Foto do produto ou, se ainda não cadastrada, ilustração neutra (nunca foto de outro produto). */
export function ProductImage({ src, alt, sizes, priority = false, className = "" }: { src: string | null; alt: string; sizes: string; priority?: boolean; className?: string }) {
  if (src) {
    return <Image src={src} alt={alt} fill sizes={sizes} priority={priority} className={`object-contain ${className}`} />;
  }
  return (
    <div className={`absolute inset-0 grid place-items-center bg-[radial-gradient(circle_at_30%_20%,var(--tv-soft-yellow),transparent_55%),radial-gradient(circle_at_80%_80%,var(--tv-soft-blue),transparent_50%)] ${className}`} role="img" aria-label={`${alt} — foto em breve`}>
      <svg viewBox="0 0 120 120" className="w-1/2 max-w-[140px] opacity-80" aria-hidden>
        <rect x="14" y="62" width="40" height="40" rx="8" fill="var(--tv-primary)" />
        <rect x="58" y="62" width="40" height="40" rx="8" fill="var(--tv-promo)" />
        <rect x="36" y="20" width="40" height="40" rx="8" fill="var(--tv-accent)" />
        <path d="M95 18l3.2 6.5 7.2 1-5.2 5 1.2 7.1L95 34.3l-6.4 3.3 1.2-7.1-5.2-5 7.2-1z" fill="var(--tv-success)" />
      </svg>
      <span className="absolute bottom-3 rounded-full bg-white/80 px-2.5 py-1 text-[11px] font-bold text-muted">Foto em breve</span>
    </div>
  );
}
