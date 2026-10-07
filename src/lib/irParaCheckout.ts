"use client";

import { site } from "@/config/site";
import { analyticsAtivo, track, type ItemAnalytics } from "@/lib/analytics";
import { montarPermalink, type LinhaCheckout } from "@/lib/checkout";

/** Dispara begin_checkout e redireciona para o checkout Shopify. */
export function irParaCheckout(linhas: LinhaCheckout[], valor: number, itens: ItemAnalytics[]) {
  const url = montarPermalink(site.shopifyDomain, linhas);
  track("begin_checkout", { value: valor, items: itens });
  // Pequena espera só quando há análise ativa, para o evento sair antes da troca de página.
  const espera = analyticsAtivo() ? 300 : 0;
  window.setTimeout(() => window.location.assign(url), espera);
}
