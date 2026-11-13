/**
 * Contrato para o emissor de NF-e que a ToyVille já utiliza (ainda não informado).
 * Enquanto não houver adaptador, a emissão automática fica bloqueada (configurações > fiscal)
 * e o pedido apenas registra manualmente número/chave/link da nota emitida no sistema da loja.
 */
export interface FiscalProvider {
  name: string;
  /** Emite NF-e para um pedido pago; deve ser idempotente pela referência do pedido. */
  issueInvoice(order: { id: string; number: number; customer: { name: string; cpf: string | null; email: string }; items: { sku: string; name: string; quantity: number; unitCents: number }[]; shippingCents: number; totalCents: number }): Promise<{ status: "issued" | "pending" | "error"; number?: string; key?: string; url?: string; error?: string }>;
  cancelInvoice(key: string, reason: string): Promise<void>;
}

export const FISCAL_PROVIDER: FiscalProvider | null = null;
