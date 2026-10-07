"use client";

import { useCart } from "@/components/cart/CartProvider";
import { BagIcon, WhatsAppIcon } from "@/components/icons";
import { WhatsAppLink } from "@/components/WhatsAppLink";

export function HeaderActions() {
  const { quantidadeTotal, abrir } = useCart();
  return (
    <div className="flex items-center justify-end">
      <WhatsAppLink
        origem="header"
        aria-label="Fale com a Venneras no WhatsApp"
        className="flex size-11 items-center justify-center hover:opacity-70"
      >
        <WhatsAppIcon className="size-[22px]" />
      </WhatsAppLink>
      <button
        type="button"
        onClick={abrir}
        aria-haspopup="dialog"
        aria-label={`Abrir sacola, ${quantidadeTotal} ${quantidadeTotal === 1 ? "item" : "itens"}`}
        className="relative flex size-11 items-center justify-center hover:opacity-70"
      >
        <BagIcon className="size-[22px]" />
        <span
          aria-hidden="true"
          className="absolute right-0.5 top-1 flex min-w-4 items-center justify-center rounded-full bg-ink px-1 text-[0.625rem] font-medium leading-4 text-paper"
        >
          {quantidadeTotal}
        </span>
      </button>
    </div>
  );
}
