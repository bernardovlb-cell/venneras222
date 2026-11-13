# Integrações externas

| Integração | Situação | O que falta |
|---|---|---|
| Mercado Pago (pagamentos) | **Implementada**, testada com API simulada | Credenciais e homologação no ambiente de teste oficial (`docs/MERCADO_PAGO.md`) |
| Retirada na loja | **Implementada** | Endereço, horário e prazo no painel |
| Entrega local (faixas de CEP + valor fixo) | **Implementada** | Faixas de CEP, valor e prazo no painel |
| Correios | **Contrato preparado, sem implementação** | Contrato com os Correios (ou agregador), credenciais da API, regras de embalagem. Implementar `quote()` em `src/server/shipping/index.ts` usando peso/dimensões já cadastrados |
| Transportadora / agregador | **Contrato preparado** | Escolha do provedor (ex.: plataforma agregadora de fretes) e token de API |
| E-mail transacional | Resend implementado, **não testado com a API real** | Conta, domínio verificado (SPF/DKIM), `RESEND_API_KEY`. Sem isso os e-mails ficam na caixa de saída do painel |
| Emissor de NF-e | **Contrato preparado** (`src/server/integrations/fiscal.ts`), emissão automática bloqueada | Nome do emissor usado pela loja e acesso à API dele. Até lá, registre manualmente número/chave/link da nota no pedido |
| Google Analytics 4 / Tag Manager / Meta Pixel | **Implementados com consentimento** | IDs no painel (Configurações > Marketing) |
| Recuperação de carrinho | **Parcial**: o e-mail só é guardado com consentimento | Provedor de e-mail e regra de envio (ex.: 24 h após abandono), a definir |
| Mercado Livre | Contrato + mapeamento de SKUs no painel | Aplicação no DevCenter, OAuth do vendedor, assinatura dos tópicos `orders_v2` e `items` |
| Amazon | Contrato + mapeamento | Conta de vendedor profissional, registro na SP-API, autorização do aplicativo |
| Shopee | Contrato + mapeamento | Shopee Open Platform (partner_id/partner_key) e autorização da loja |

## Desenho para marketplaces (estoque único)

- **Fonte da verdade do estoque**: `product_variants` (físico e reservado) + `inventory_movements` com coluna `channel`.
- **Associação**: `external_listings` (canal + id do anúncio + SKU interno; índice único impede vínculo duplicado).
- **Pedidos de outros canais**: entram em `orders` com `channel` e `external_id` (índice único → a mesma venda não é importada duas vezes) e baixam estoque com `channel` do marketplace.
- **Sincronização**: a cada movimento de estoque, enfileirar atualização para os anúncios vinculados com `sync_stock = true`. Erros vão para `integration_logs` e `external_listings.last_error`, com nova tentativa.
- **Risco a tratar na implementação**: venda simultânea no site e no marketplace da última unidade. Mitigação: manter um estoque de segurança por canal ou reservar no recebimento da notificação do marketplace.
