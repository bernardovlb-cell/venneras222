"use client";

import { whatsappUrl } from "@/config/site";
import { track } from "@/lib/analytics";

/** Link de WhatsApp com evento "contact". Não renderiza nada se o número não estiver configurado. */
export function WhatsAppLink({
  mensagem,
  origem,
  className,
  children,
  ...rest
}: { mensagem?: string; origem: string; className?: string; children: React.ReactNode } & Omit<
  React.AnchorHTMLAttributes<HTMLAnchorElement>,
  "href"
>) {
  const url = whatsappUrl(mensagem);
  if (!url) return null;
  return (
    <a
      {...rest}
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      onClick={() => track("contact", { method: "whatsapp", origem })}
    >
      {children}
    </a>
  );
}
