"use client";

import Image from "next/image";
import { useState } from "react";

/**
 * Imagem com proporção fixa (sem CLS). Sem src, ou se o arquivo não carregar,
 * mostra o bloco cinza "FOTO PENDENTE" na mesma proporção.
 */
export function Foto({
  src,
  alt,
  sizes,
  proporcao = "aspect-[4/5]",
  priority = false,
  escura = false,
  className = "",
  imgClassName = "",
}: {
  src?: string | null;
  alt: string;
  sizes: string;
  proporcao?: string;
  priority?: boolean;
  escura?: boolean;
  className?: string;
  imgClassName?: string;
}) {
  const [falhou, setFalhou] = useState(false);
  return (
    <div className={`relative w-full overflow-hidden ${proporcao} ${escura ? "bg-[#2a2a28]" : "bg-placeholder"} ${className}`}>
      {src && !falhou ? (
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes}
          priority={priority}
          onError={() => setFalhou(true)}
          className={`object-cover ${imgClassName}`}
        />
      ) : (
        <span
          role="img"
          aria-label={`${alt} (foto pendente)`}
          className={`label absolute inset-0 flex items-center justify-center p-2 text-center text-[0.625rem] ${escura ? "text-paper/70" : "text-muted"}`}
        >
          Foto pendente
        </span>
      )}
    </div>
  );
}
