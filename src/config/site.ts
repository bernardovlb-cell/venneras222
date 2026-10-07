/**
 * Configuração central do site.
 *
 * ATENÇÃO: pixDescontoPercentual, parcelasSemJuros e parcelaMinima são SÓ EXIBIÇÃO.
 * O site não calcula cobrança nenhuma. Esses valores PRECISAM bater com a
 * configuração real no Shopify (descontos) e no Mercado Pago (parcelamento).
 * Se ficarem diferentes, o cliente vê um preço aqui e outro no checkout.
 *
 * Campos `null` = ainda não fornecidos. O site esconde o que depende deles.
 */
export const site = {
  nome: "Venneras",
  url: "https://vennerascomercio.com",
  assinatura: "RIO DE JANEIRO",

  // TODO [PREENCHER]: número com DDI e DDD, só dígitos. Ex.: "5521999999999".
  whatsappNumero: null as string | null,
  whatsappMensagemPadrao: "Olá! Vim pelo site da Venneras e tenho uma dúvida.",
  instagramUrl: "https://www.instagram.com/usevenneras",
  instagramHandle: "@usevenneras",

  // TODO [PREENCHER]: % de desconto no Pix configurado no Shopify. Ex.: 5.
  pixDescontoPercentual: null as number | null,
  // TODO [PREENCHER]: nº de parcelas sem juros configurado no Mercado Pago. Ex.: 3.
  parcelasSemJuros: null as number | null,
  // TODO [PREENCHER]: valor mínimo de cada parcela, em reais. Ex.: 50.
  parcelaMinima: null as number | null,
  // TODO [PREENCHER]: frete grátis acima de R$ X (se houver). null = não mostra.
  freteGratisAcima: null as number | null,

  // Mensagem da faixa do topo. null = monta a partir de Pix/parcelas (se configurados).
  mensagemFaixaTopo: null as string | null,

  shopifyDomain: "g2psx0-2d.myshopify.com",
  cnpj: "65.528.116/0001-43",
  razaoSocial: "Venneras Comercial",
} as const;

export function faixaTopoTexto(): string {
  if (site.mensagemFaixaTopo) return site.mensagemFaixaTopo;
  const partes: string[] = [];
  if (site.pixDescontoPercentual) partes.push(`Pix com ${site.pixDescontoPercentual}% de desconto`);
  if (site.parcelasSemJuros) partes.push(`Até ${site.parcelasSemJuros}x sem juros`);
  if (partes.length === 0) return "Compra segura · Pix e cartão via Mercado Pago";
  return partes.join(" · ");
}

export function whatsappUrl(mensagem: string = site.whatsappMensagemPadrao): string | null {
  if (!site.whatsappNumero) return null;
  return `https://wa.me/${site.whatsappNumero}?text=${encodeURIComponent(mensagem)}`;
}
