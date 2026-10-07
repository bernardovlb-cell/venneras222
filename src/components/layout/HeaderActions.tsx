"use client";

import { BagIcon, WhatsAppIcon } from "@/components/icons";
import { whatsappUrl } from "@/config/site";

export function HeaderActions() {
  const wa = whatsappUrl();
  // TODO (passo 5): contador e abertura do drawer vêm do contexto da sacola.
  const quantidade: number = 0;
  return (
    <div className="flex items-center justify-end">
      {wa && (
        <a
          href={wa}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Fale com a Venneras no WhatsApp"
          className="flex size-11 items-center justify-center hover:opacity-70"
        >
          <WhatsAppIcon className="size-[22px]" />
        </a>
      )}
      <button
        type="button"
        aria-label={`Sacola, ${quantidade} ${quantidade === 1 ? "item" : "itens"}`}
        className="relative flex size-11 items-center justify-center hover:opacity-70"
      >
        <BagIcon className="size-[22px]" />
        <span
          aria-hidden="true"
          className="absolute right-0.5 top-1 flex min-w-4 items-center justify-center rounded-full bg-ink px-1 text-[0.625rem] font-medium leading-4 text-paper"
        >
          {quantidade}
        </span>
      </button>
    </div>
  );
}
