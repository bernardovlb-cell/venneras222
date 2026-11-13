# Arquitetura

## Stack escolhida e por quê

| Camada | Escolha | Justificativa |
|---|---|---|
| Aplicação | **Next.js 16 (App Router) + React 19 + TypeScript** | Um único projeto com renderização no servidor (SEO das páginas de produto), Server Actions para mutações (com checagem de origem embutida) e rotas de API para webhook/cron. |
| Estilo | **Tailwind CSS 4** com tokens CSS | Tokens de marca (`--tv-primary` etc.) vêm do banco e são trocados no painel sem rebuild. |
| Banco | **PostgreSQL** (local, Supabase ou qualquer provedor) | Transações e `SELECT … FOR UPDATE` são essenciais para estoque e cupons sem venda dupla. `pg_trgm` + `unaccent` dão busca tolerante a erros sem serviço pago. |
| Acesso a dados | **Drizzle ORM** + `pg` (node-postgres) com `attachDatabasePool` da Vercel | Tipagem do schema ao resultado, migrações SQL versionadas. O `pg` é o driver suportado pelo `attachDatabasePool`, que fecha conexões ociosas antes de a função ser suspensa (sem isso, conexões “mortas” travavam requisições na Vercel). Conexão com SSL e timeouts curtos. |
| Autenticação | **Própria** (scrypt + sessões no banco + cookie httpOnly) | Ver “Por que não Supabase Auth” abaixo. |
| Pagamento | **Mercado Pago Checkout Pro** via API REST | Ver `docs/MERCADO_PAGO.md`. |
| Imagens | `sharp` (WebP, 1600px + miniatura 480px, sem EXIF) + driver `local` ou `supabase` | Otimização no envio; armazenamento trocável por variável de ambiente. |
| Testes | Vitest (unidade + integração com Postgres real) e Playwright (ponta a ponta) | |

### Onde divergi da preferência inicial (e por quê)

**Supabase:** recomendado como *banco gerenciado + armazenamento de imagens*, mas **não** como camada de autenticação/API.
- Toda leitura e escrita passa pelo servidor Next.js; o navegador nunca fala direto com o banco. Assim as regras de preço, estoque e permissão ficam num só lugar.
- Usar Supabase Auth exigiria manter duas fontes de identidade (auth.users + tabela de perfis/papéis) e políticas RLS espelhando as regras do servidor — mais superfície para erro, sem ganho para este caso.
- Como defesa extra, a migração `0001` **liga RLS sem políticas em todas as tabelas**: se a chave pública (`anon`) do Supabase vazar ou for usada, ela não lê nem grava nada.
- O projeto não depende do Supabase: qualquer PostgreSQL 15+ serve (Neon, RDS, servidor próprio).

Ponto fraco assumido: autenticação própria exige cuidado. Mitigações implementadas: scrypt com sal, comparação em tempo constante, tokens de sessão aleatórios de 256 bits guardados apenas como hash, expiração (30 dias cliente / 12 h equipe), rotação de sessões ao trocar senha, limitação de tentativas por IP e por e-mail, mensagens que não revelam se o e-mail existe na recuperação de senha.

## Organização

```
src/
  app/
    (store)/          loja pública e área do cliente (/conta)
    admin/            painel (layout próprio, (panel) protegido)
    api/              webhook Mercado Pago, cron, sugestões de busca
    actions/          Server Actions da loja
  components/         UI reutilizável (loja, painel, consentimento)
  lib/                regras PURAS e testáveis: pricing, money, importação, assinatura MP, idade
  server/
    db/               schema Drizzle e cliente
    auth/             senha, sessão, guards, permissões
    services/         regras de negócio (catálogo, carrinho, pedidos, admin, importação…)
    payments/         cliente Mercado Pago
    shipping/         provedores de frete (retirada, entrega local, Correios/transportadora pendentes)
    integrations/     contratos de marketplaces e emissor fiscal
    seed/             dados estruturais, rascunhos de políticas, demonstração
drizzle/              migrações SQL
tests/                Vitest
e2e/                  Playwright + servidor simulado do Mercado Pago (somente testes)
```

Regra de camadas: componentes de interface não acessam o banco; páginas chamam `services`; `services` usam `lib` (puro) e `db`. Toda ação administrativa chama `requirePermission(...)` **no servidor** e registra auditoria.

## Modelo de dados (35 tabelas)

- **Acesso**: `users`, `roles` (permissões granulares, `*` = proprietário), `sessions`, `password_reset_tokens`, `addresses`.
- **Catálogo**: `categories` (árvore), `brands`, `products` (idade em meses, segurança, certificações, peso/dimensões, SEO, `extra` jsonb), `product_variants` (SKU, preço, preço promocional com período, estoque físico e reservado, imagem própria), `product_images`.
- **Estoque**: `inventory_movements` (toda alteração com motivo, canal, pedido e usuário). Restrições impedem estoque negativo e reserva maior que o físico.
- **Compra**: `carts`, `cart_items`, `orders` (snapshot de valores, endereço, modalidade, status de pagamento/separação/fiscal separados, canal e id externo únicos), `order_items` (preço “de”, preço efetivo, rateio do cupom), `order_events`, `payments`, `webhook_events`.
- **Promoções**: `coupons`, `coupon_redemptions`, `promotions` (percentual, valor fixo, frete grátis, relâmpago).
- **Conteúdo**: `banners`, `home_sections`, `pages`, `settings`.
- **Relacionamento**: `favorites`, `reviews`, `support_tickets`, `ticket_messages`.
- **Operação**: `audit_logs`, `rate_limits`, `email_outbox`, `external_listings`, `integration_logs`.

Valores em centavos (inteiros). O pedido guarda o que foi cobrado; mudar o preço do produto depois não altera pedidos (testado).

## Fluxos críticos

**Pedido**: bloqueia as variações (`FOR UPDATE`, ordem por id) → recalcula preço no servidor → cota frete só em modalidade configurada → bloqueia o cupom e reconta usos → grava pedido + itens + reserva de estoque + uso do cupom numa transação. Chave de idempotência do formulário impede pedido duplicado.

**Pagamento**: preferência Checkout Pro com `external_reference = id do pedido` e itens somando exatamente o total. Confirmação por webhook (assinatura HMAC validada, deduplicação por `x-request-id`, consulta à API), pela página de retorno (o `payment_id` da URL só serve de pista; o status vem da API) e por reconciliação na expiração. Máquina de estados idempotente: aprovado (baixa estoque), pendente/em análise/recusado (só registra), cancelado (não cancela o pedido de imediato, porque o cliente pode pagar de outra forma), reembolsado (cancela e repõe estoque se não enviado), chargeback (alerta). Valor divergente, moeda diferente, pagamento em duplicidade e pagamento após cancelamento geram alerta no painel e nunca marcam como pago indevidamente.

**Expiração**: pedidos não pagos expiram após `reservationHours` (padrão 48 h, também vencimento de Pix/boleto). Antes de cancelar, o sistema consulta o Mercado Pago.

## Segurança

- Rotas `/admin` e `/conta`: barreira inicial no `proxy.ts` (sem cookie → login) e verificação real de sessão/papel em cada página e ação. Cliente que acessa `/admin` recebe 404.
- Pedidos de visitante: acesso só com token aleatório (hash no banco). Pedidos não são vinculados a contas por e-mail (sem verificação de e-mail isso permitiria ver pedidos alheios).
- Limites de requisição em login, cadastro, recuperação de senha, checkout, cupom, busca, avaliações e atendimento (persistidos no Postgres, funcionam em serverless).
- Cabeçalhos: HSTS, nosniff, frame SAMEORIGIN, referrer-policy, permissions-policy. Cookies httpOnly, SameSite=Lax, Secure em produção (`__Host-`).
- Segredos só em variáveis de ambiente do servidor. Nenhuma variável `NEXT_PUBLIC_` com segredo.
- Uploads validados pelo conteúdo (sharp), convertidos e sem metadados; caminho local protegido contra path traversal.
- Logout só por POST.
- LGPD: consentimento de cookies antes de qualquer rastreador; exportação e exclusão (anonimização) da conta; solicitações LGPD pelo atendimento; visualização de cliente no painel registrada em auditoria.

## Limites conhecidos

- A listagem resolve o preço promocional em memória (mesmo motor do checkout). Adequado para alguns milhares de produtos; acima disso, materializar o preço efetivo em coluna atualizada por job.
- Páginas são renderizadas a cada requisição (sem cache). Com tráfego alto, adicionar cache por tag em catálogo/home.
- E-mails só saem com provedor configurado (Resend implementado, não testado contra a API real).
