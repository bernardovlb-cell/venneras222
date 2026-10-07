"use client";

/**
 * Eventos de análise. GA4 e Meta Pixel só existem na página depois do aceite
 * de cookies (ver components/Analytics.tsx); antes disso, track() não faz nada.
 */
type Evento = "view_item" | "add_to_cart" | "begin_checkout" | "contact";

const nomeMeta: Record<Evento, string> = {
  view_item: "ViewContent",
  add_to_cart: "AddToCart",
  begin_checkout: "InitiateCheckout",
  contact: "Contact",
};

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    fbq?: (...args: unknown[]) => void;
  }
}

export interface ItemAnalytics {
  item_id: string;
  item_name: string;
  item_brand?: string;
  item_category?: string;
  item_variant?: string;
  price?: number;
  quantity?: number;
}

export function track(evento: Evento, dados: { value?: number; items?: ItemAnalytics[]; [k: string]: unknown } = {}) {
  if (typeof window === "undefined") return;
  try {
    window.gtag?.("event", evento, { currency: "BRL", ...dados });
    window.fbq?.("track", nomeMeta[evento], {
      currency: "BRL",
      value: dados.value,
      content_type: "product",
      content_ids: dados.items?.map((i) => i.item_id),
      contents: dados.items?.map((i) => ({ id: i.item_id, quantity: i.quantity ?? 1 })),
    });
  } catch {
    // Análise nunca pode quebrar a compra.
  }
}

export function analyticsAtivo() {
  return typeof window !== "undefined" && Boolean(window.gtag || window.fbq);
}
