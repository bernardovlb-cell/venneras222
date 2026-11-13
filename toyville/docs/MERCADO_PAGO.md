# Mercado Pago — Checkout Pro

## Por que Checkout Pro

Opções oficiais no Brasil: **Checkout Pro** (o cliente paga no ambiente do Mercado Pago), **Checkout Bricks** (componentes embutidos no site) e **Checkout Transparente/API** (formulário próprio).

Escolha: **Checkout Pro**.
- Atende os quatro meios pedidos: a documentação oficial lista cartões de crédito e débito, boleto e Pix (o Pix só aparece se a conta tiver **chave Pix cadastrada**).
- Nenhum dado de cartão passa pelo servidor da ToyVille (menor escopo PCI); 3-D Secure, antifraude e parcelamento ficam com o Mercado Pago.
- Menos código para homologar e manter.

Contra (assumido): o cliente sai do site para pagar, o que pode reduzir conversão em relação ao Bricks. Se os dados de venda mostrarem abandono nessa etapa, migrar para o **Payment Brick** reaproveitando pedido, webhook e máquina de estados (só a etapa de pagamento muda).

## Ativar o ambiente de TESTE

1. Acesse https://www.mercadopago.com.br/developers/panel/app e crie uma aplicação do tipo **Checkout Pro**.
2. Em **Credenciais de teste**, copie o *Access Token* para `MP_ACCESS_TOKEN` e defina `MP_ENVIRONMENT=test`. Atenção: no Checkout Pro as credenciais de teste **também começam com `APP_USR-`**, então o ambiente precisa ser declarado (o painel acusa se faltar).
3. Publique o site em uma URL **HTTPS** (preview da Vercel serve). O Mercado Pago só aceita `notification_url` e retorno automático em HTTPS; em `http://localhost` o pagamento funciona, mas o webhook não chega. Para testar localmente, use um túnel HTTPS e ajuste `APP_URL`.
4. Em **Webhooks > Configurar notificações**: URL `https://SEU-DOMINIO/api/webhooks/mercadopago`, evento **Pagamentos**. Revele a **chave secreta** e coloque em `MP_WEBHOOK_SECRET`.
5. Crie **usuários de teste** (vendedor e comprador) no painel do Mercado Pago e use os **cartões de teste** da documentação oficial para simular aprovado, recusado e pendente.
6. Faça uma compra: o pedido deve ir para “Pago” sozinho em alguns segundos, e o painel mostra o webhook em Integrações.

Para conferir: Painel > Pedidos > abrir pedido > “Consultar pagamento no Mercado Pago” força a reconciliação.

## Ativar pagamentos REAIS

1. Conclua o cadastro da conta Mercado Pago (dados da empresa e conta bancária) e **cadastre a chave Pix**.
2. Em **Credenciais de produção**, gere o *Access Token* de produção, substitua `MP_ACCESS_TOKEN` e mude `MP_ENVIRONMENT=production`.
3. Configure o webhook de **produção** (é separado do de teste) e atualize `MP_WEBHOOK_SECRET`.
4. Revise em Configurações > Checkout: máximo de parcelas e prazo de reserva/vencimento.
5. Faça uma compra real de valor baixo e reembolse pelo painel para validar o ciclo completo.
6. Use a ferramenta de **qualidade da integração** do Mercado Pago.

## O que o código faz

- `POST /checkout/preferences` com `external_reference` = id do pedido, itens que somam exatamente o total, `X-Idempotency-Key`, expiração igual à reserva de estoque.
- Webhook valida `x-signature` (HMAC-SHA256 de `id:<data.id>;request-id:<x-request-id>;ts:<ts>;`), deduplica por `x-request-id` e **consulta o pagamento na API** antes de alterar o pedido.
- Status: `approved` → pago; `pending`/`in_process`/`authorized` → aguardando/análise; `rejected` → recusado (o cliente pode tentar de novo); `cancelled` → registrado (o pedido expira pela rotina); `refunded` → cancelado com reposição de estoque se não enviado; `charged_back` → alerta.
- Reembolso pelo painel: `POST /v1/payments/{id}/refunds` com chave de idempotência; o status só muda após confirmação.

## Testado / não testado

- **Testado** (automatizado, com API simulada por HTTP nos testes): criação de preferência, assinatura válida/inválida/adulterada, notificação repetida, falha do provedor (500 para reenvio), aprovado, pendente, recusado, valor divergente, pagamento duplicado, pago após cancelamento, expiração com reconciliação, reembolso.
- **Não testado contra o Mercado Pago real**: este ambiente de desenvolvimento não tinha acesso de rede a `api.mercadopago.com` nem credenciais. A homologação com credenciais de teste (passos acima) é obrigatória antes de vender.
