"use client";
/** Eventos de e-commerce. Só disparam se o script correspondente foi carregado (ou seja, após consentimento). */
type W = Window & { gtag?: (...a: unknown[]) => void; fbq?: (...a: unknown[]) => void; dataLayer?: unknown[] };

export function track(event: "view_item" | "add_to_cart" | "begin_checkout" | "purchase" | "search", data: { value?: number; items?: { id: string; name: string; price: number; quantity: number }[]; search_term?: string; transaction_id?: string }) {
  if (typeof window === "undefined") return;
  const w = window as W;
  const ga = { currency: "BRL", value: data.value, transaction_id: data.transaction_id, search_term: data.search_term, items: data.items?.map((i) => ({ item_id: i.id, item_name: i.name, price: i.price, quantity: i.quantity })) };
  w.gtag?.("event", event, ga);
  w.dataLayer?.push({ event, ecommerce: ga });
  const fbMap: Record<string, string> = { view_item: "ViewContent", add_to_cart: "AddToCart", begin_checkout: "InitiateCheckout", purchase: "Purchase", search: "Search" };
  w.fbq?.("track", fbMap[event], { currency: "BRL", value: data.value, content_ids: data.items?.map((i) => i.id), content_type: "product", search_string: data.search_term });
}
