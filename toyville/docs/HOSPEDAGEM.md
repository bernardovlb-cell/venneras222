# Hospedagem

## O que o projeto precisa

1. Servidor **Node.js** executando Next.js (renderização no servidor, Server Actions, webhook e cron). Não é um site estático.
2. **PostgreSQL** gerenciado, com backup.
3. **Armazenamento persistente de imagens** (em serverless o disco não persiste: usar `STORAGE_DRIVER=supabase`).
4. **HTTPS** (obrigatório para o webhook do Mercado Pago) e uma tarefa agendada a cada 15–60 min.

## Comparativo

Preços abaixo foram pesquisados em nov/2026 em fontes de terceiros; confirme nas páginas oficiais antes de contratar.

| Opção | Roda este projeto? | Custo inicial | Observações |
|---|---|---|---|
| **Vercel Hobby** | Tecnicamente sim | Grátis | **Uso não comercial** pelos termos da Vercel — não serve para a loja em produção. Útil para previews. |
| **Vercel Pro** | Sim, sem adaptação | ~US$ 20/usuário/mês (+ uso excedente) | Deploy pelo GitHub, previews por branch, cron nativo (`vercel.json` já incluído), HTTPS automático. Precisa de banco e storage externos. |
| **Hostinger — hospedagem compartilhada comum** | **Não** | — | Planos de PHP/WordPress não executam servidor Next.js. |
| **Hostinger Business / Cloud (Node.js)** | Provavelmente sim | Baixo (preço promocional em contrato longo; renovação mais cara) | A Hostinger anuncia Node.js nesses planos e Next.js em modo servidor (build *standalone*). Ressalvas da própria documentação: substitui o `next.config` se não reconhecer (perderíamos cabeçalhos de segurança e configurações) e versões suportadas de Node limitadas. **Precisa de teste real** antes de decidir; sem cron nativo (usar cron externo). |
| **Hostinger VPS** | Sim | Baixo | Controle total, mas você administra servidor, atualizações, HTTPS, backups e monitoramento. |
| **Railway / Render** | Sim | ~US$ 5 (Railway Hobby, com crédito de uso) / ~US$ 7 (Render Starter) | Servidor Node contínuo; Railway também oferece Postgres. Bom meio-termo entre custo e simplicidade. |
| **Supabase (banco + storage)** | Complemento | Grátis / ~US$ 25/mês (Pro) | No plano **gratuito o projeto é pausado após 1 semana sem atividade** — inaceitável para loja. Pro não pausa e tem backups diários. |

## Recomendação

**Para lançar com segurança e menos manutenção: Vercel Pro + Supabase Pro** (≈ US$ 45/mês antes de excedentes).
- Funciona com o código como está (já testado em `next build`/`next start`), cron configurado, previews por branch para revisar mudanças antes de publicar.
- Ponto fraco: custo em dólar e cobrança por uso acima da franquia. Para o volume de uma loja iniciante, a franquia do Pro costuma bastar, mas acompanhe o painel de uso.

**Alternativa mais barata, se o orçamento for o fator decisivo:** Railway (app + Postgres) ou um VPS, mantendo o Supabase só para imagens. Custa menos, mas transfere para a ToyVille parte da operação (backups, monitoramento).

**Não recomendo Hostinger compartilhada.** Os planos Business/Cloud com Node.js podem funcionar, mas a substituição silenciosa do `next.config` é um risco concreto para este projeto. Só considere após um deploy de teste validado.

Nada precisa ser contratado agora: o projeto roda localmente.

## Publicar na Vercel (passo a passo)

1. Crie o projeto no **Supabase** (plano Pro para produção). Em *Database > Connection string*, copie a URL do **pooler em modo transação (porta 6543)** → `DATABASE_URL`. Mantenha `DB_PREPARE` sem valor.
2. Rode as migrações e os dados iniciais contra esse banco a partir da sua máquina (`npm run db:migrate`, `npm run db:seed`, `npm run admin:create -- --email ...`). Para migrações, use a URL de **conexão direta (porta 5432)**.
3. No Supabase **Storage**, crie o bucket público `produtos`. Copie `SUPABASE_URL` e a `service_role key` (só para o servidor).
4. Na **Vercel**: *Add New > Project > Import* do repositório, **Root Directory = `toyville`**.
5. Variáveis de ambiente (Settings > Environment Variables): `DATABASE_URL`, `APP_URL` (https://seu-dominio), `CRON_SECRET`, `MP_ACCESS_TOKEN`, `MP_WEBHOOK_SECRET`, `STORAGE_DRIVER=supabase`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_STORAGE_BUCKET=produtos`, `STORAGE_PUBLIC_HOST=<seu-projeto>.supabase.co`, e opcionalmente `EMAIL_PROVIDER=resend`, `RESEND_API_KEY`, `EMAIL_FROM`.
6. Deploy. Configure o domínio em *Settings > Domains*. Cadastre o webhook no Mercado Pago (`docs/MERCADO_PAGO.md`).
7. A Vercel envia `Authorization: Bearer <CRON_SECRET>` nas chamadas de cron quando `CRON_SECRET` existe.

## Publicar em servidor Node (VPS/Railway/Render)

```bash
npm ci && npm run build && npm run db:migrate && npm start
```

Configure as mesmas variáveis, um proxy HTTPS e um agendador chamando a cada 30 min:

```bash
curl -fsS -H "Authorization: Bearer $CRON_SECRET" https://seu-dominio/api/cron/expire-orders
```
