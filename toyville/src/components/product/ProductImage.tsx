import Image from "next/image";

/** Foto do produto ou, se ainda não cadastrada, ilustração neutra (nunca foto de outro produto). */
export function ProductImage({ src, alt, sizes, priority = false, className = "" }: { src: string | null; alt: string; sizes: string; priority?: boolean; className?: string }) {
  if (src) {
    return <Image src={src} alt={alt} fill sizes={sizes} priority={priority} className={`object-contain ${className}`} />;
  }
  return (
    <div className={`absolute inset-0 flex flex-col items-center justify-center gap-2 bg-[#f6f5f1] text-[#a7a294] ${className}`} role="img" aria-label={`${alt} — foto em breve`}>
      <svg viewBox="0 0 24 24" className="w-1/5 max-w-[56px]" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <rect x="3" y="5" width="18" height="14" rx="2" /><circle cx="9" cy="10" r="1.8" /><path d="m21 16-5-5-8 8" />
      </svg>
      <span className="text-[11px] font-bold uppercase tracking-wider text-[#6b6657]">Foto em breve</span>
    </div>
  );
}
