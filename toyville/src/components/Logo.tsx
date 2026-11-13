import Image from "next/image";
import Link from "next/link";

/**
 * Logo oficial (arquivo fornecido pela ToyVille). Preserva a proporção original
 * (largura/altura do arquivo) — nunca é cortada nem esticada; só muda de escala.
 */
export function Logo({ src, width, height, className = "", priority = false, href = "/" }: {
  src: string; width: number; height: number; className?: string; priority?: boolean; href?: string | null;
}) {
  const img = (
    <Image src={src} alt="ToyVille — página inicial" width={width} height={height} priority={priority}
      sizes="(max-width: 768px) 120px, 160px" className={`h-auto ${className}`} style={{ aspectRatio: `${width} / ${height}` }} />
  );
  return href ? <Link href={href} className="inline-block shrink-0 rounded-xl">{img}</Link> : img;
}
