/**
 * Contratos para integrações futuras com marketplaces. NENHUM adaptador está ativo:
 * cada um exige credenciais/aplicação aprovada (ver docs/INTEGRACOES.md).
 *
 * Fluxo previsto:
 *  - Estoque: ao mudar `available` de uma variação (inventory_movements), enfileirar sync para cada
 *    external_listing com sync_stock = true → adapter.updateStock(externalId, available).
 *  - Pedidos: webhook/polling do canal → adapter.fetchOrder → criar pedido com channel=<canal>,
 *    external_id=<id do canal> (índice único impede duplicidade) e baixar estoque com channel=<canal>.
 *  - Falhas: registrar em integration_logs e em external_listings.last_error; reprocessar com backoff.
 */
export interface MarketplaceAdapter {
  channel: "mercadolivre" | "amazon" | "shopee";
  updateStock(externalId: string, available: number): Promise<void>;
  fetchOrder(externalOrderId: string): Promise<{ externalId: string; items: { externalSku: string; quantity: number; unitCents: number }[]; buyer: { name: string; email?: string } }>;
}

export const CHANNELS = [
  { key: "mercadolivre", name: "Mercado Livre", requirements: "Aplicação no DevCenter do Mercado Livre, OAuth do vendedor (refresh token), notificações de orders_v2 e items." },
  { key: "amazon", name: "Amazon", requirements: "Conta de vendedor profissional, registro de desenvolvedor na Selling Partner API (SP-API) e autorização do app." },
  { key: "shopee", name: "Shopee", requirements: "Cadastro no Shopee Open Platform, partner_id/partner_key e autorização da loja (shop_id)." },
] as const;

/** Registro de adaptadores ativos — vazio até a implementação com credenciais reais. */
export const ADAPTERS: Partial<Record<MarketplaceAdapter["channel"], MarketplaceAdapter>> = {};
