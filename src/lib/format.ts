const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

/** Formata em reais. Troca o espaço não separável por espaço normal para evitar diferenças entre ambientes. */
export function formatBRL(valor: number): string {
  return brl.format(valor).replace(/ /g, " ");
}
