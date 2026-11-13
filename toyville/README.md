# ToyVille — loja virtual

E-commerce completo da ToyVille: loja mobile-first, carrinho, checkout com Mercado Pago (Checkout Pro),
área do cliente, painel administrativo, estoque, promoções, conteúdo editável e base para integrações
(marketplaces, emissor fiscal, transportadoras).

> Este projeto fica na pasta `toyville/`. O restante do repositório (site da Venneras) **não foi alterado**.

Documentação:

| Arquivo | Conteúdo |
|---|---|
| [`docs/ACOMPANHAMENTO.md`](docs/ACOMPANHAMENTO.md) | Status: concluído, pendente, dependências, testes, próximos passos |
| [`docs/ARQUITETURA.md`](docs/ARQUITETURA.md) | Stack, decisões, modelo de dados, segurança |
| [`docs/MERCADO_PAGO.md`](docs/MERCADO_PAGO.md) | Como ativar pagamentos de teste e reais |
| [`docs/PUBLICAR-HOMOLOGACAO.md`](docs/PUBLICAR-HOMOLOGACAO.md) | **Comece por aqui**: publicar a homologação na Vercel + Supabase, sem terminal |
| [`docs/HOSPEDAGEM.md`](docs/HOSPEDAGEM.md) | Comparativo de hospedagem e passo a passo de publicação |
| [`docs/INTEGRACOES.md`](docs/INTEGRACOES.md) | Marketplaces, NF-e, frete, e-mail: o que existe e o que falta |
| [`docs/MARCA.md`](docs/MARCA.md) | Uso da logo e proposta (pendente de aprovação) de favicon/versão compacta |

## Requisitos

- Node.js 20 ou mais novo (testado com 22)
- PostgreSQL 15+ com as extensões `pg_trgm` e `unaccent` (padrão no PostgreSQL e no Supabase)

## Rodar localmente

```bash
npm install
```

```bash
cp .env.example .env.local
```

Edite `DATABASE_URL` em `.env.local` e depois:

```bash
npm run db:migrate
```

```bash
npm run db:seed
```

```bash
npm run admin:create -- --email voce@exemplo.com --name "Seu Nome"
```

Opcional, dados fictícios para testar (marcados com [DEMO], removíveis):

```bash
npm run db:seed-demo
```

```bash
npm run dev
```

Loja: http://localhost:3000 · Painel: http://localhost:3000/admin

## Comandos

| Comando | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` / `npm start` | Build e servidor de produção |
| `npm run typecheck` | Verificação de tipos |
| `npm run lint` | ESLint |
| `npm test` | Testes unitários e de integração (usa o banco `toyville_test` — veja `tests/setup-env.ts`) |
| `npm run test:e2e` | Testes no navegador contra o build (cria o banco `toyville_e2e`; rode `npm run build` antes) |
| `npm run db:generate` | Gera migração após alterar `src/server/db/schema.ts` |
| `npm run db:migrate` | Aplica migrações |
| `npm run db:seed` | Dados estruturais (idempotente) |
| `npm run db:seed-demo` / `npm run db:purge-demo` | Cria / remove dados de demonstração |
| `npm run admin:create` | Cria ou redefine o usuário proprietário |
| `npm run brand:logo` | Regera as versões otimizadas da logo a partir de `brand-source/` |

Para os testes, crie os bancos uma vez (ajuste usuário/senha):

```bash
createdb toyville_test && psql -d toyville_test -c "create extension if not exists pg_trgm; create extension if not exists unaccent;" && DATABASE_URL=postgres://toyville:toyville@localhost:5432/toyville_test npm run db:migrate
```

## Manutenção básica

- **Produtos**: Painel > Produtos (manual) ou Painel > Produtos > Importar planilha (CSV/XLSX, com modelo para baixar).
- **Preço promocional**: na variação (com datas) ou em Promoções (desconto automático/relâmpago). Não se acumulam: vale o menor preço.
- **Estoque**: ajuste por variação com motivo; todo movimento fica no histórico do produto.
- **Pedidos**: só mudam para “pago” com confirmação do Mercado Pago. Separação, retirada, envio, cancelamento (não pagos) e reembolso pelo painel.
- **Textos legais**: Painel > Conteúdo. Páginas com `[PENDENTE: …]` não podem ser publicadas.
- **Agendamentos** (`vercel.json`): `/api/cron/expire-orders` e `/api/cron/abandoned-carts`, com `Authorization: Bearer <CRON_SECRET>`. Hoje 1×/dia (limite do plano gratuito da Vercel); no Pro, passe para de hora em hora.
- **Backups**: ative backups automáticos no provedor do banco antes de vender.
