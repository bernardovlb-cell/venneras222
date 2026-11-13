# Publicar a homologação (sem terminal)

Objetivo: colocar a ToyVille num endereço HTTPS de teste para validar pagamentos com o Mercado Pago
em modo de teste. **Não é para vender ainda.** Tempo estimado: 30 minutos.

Tudo acontece no navegador. Nenhuma senha ou chave deve ser colada em chat — só nos painéis do Supabase e da Vercel.

## 1. Supabase (banco de dados e imagens)

1. Em https://supabase.com/dashboard, clique em **New project**.
   - Nome: `toyville-homologacao`. Região: **South America (São Paulo)**.
   - Crie uma senha forte para o banco e guarde num gerenciador de senhas.
   - Plano gratuito serve para a homologação (ele pausa após 1 semana sem uso; basta reativar no painel).
2. Com o projeto pronto, clique em **Connect** (topo da página):
   - Copie a string do **Transaction pooler** (porta **6543**) → será a `DATABASE_URL`.
   - Copie a string do **Session pooler** (porta **5432**) → será a `DATABASE_URL_DIRECT` (usada nas migrações).
   - Nas duas, troque `[YOUR-PASSWORD]` pela senha do passo 1.
3. **Storage** → **New bucket** → nome `produtos`, marque **Public bucket** → criar.
4. **Project Settings → API Keys**: copie a **secret key** (ou a `service_role`, se aparecer como “legacy”) → será a `SUPABASE_SERVICE_ROLE_KEY`. Essa chave dá acesso total: só vai para a Vercel.
5. Anote a **Project URL** (ex.: `https://abcd1234.supabase.co`) → `SUPABASE_URL`, e o host sem `https://` → `STORAGE_PUBLIC_HOST`.

## 2. Vercel (site)

> **Atenção à branch.** Este repositório não tem `main`: a branch padrão é `claude/affectionate-einstein-1x7kfn`, e é ela que a Vercel publica.
> A ToyVille entra nela pelo pull request [bernardovlb-cell/venneras222#1](https://github.com/bernardovlb-cell/venneras222/pull/1). **Faça o merge antes de importar na Vercel**; sem isso a pasta `toyville` não existe na branch publicada e o deploy falha. O merge só adiciona a pasta `toyville/`: o site da Venneras não muda.

1. Em https://vercel.com/new, importe o repositório **`venneras222`** do GitHub (autorize o acesso se pedido).
2. Antes de clicar em Deploy:
   - **Root Directory**: `toyville` (obrigatório — a raiz é o site da Venneras).
   - Framework: Next.js (detectado). Não altere os comandos de build: o `vercel.json` já define.
   - **Environment Variables** — adicione:

| Nome | Valor |
|---|---|
| `DATABASE_URL` | string do Transaction pooler (passo 1.2) |
| `DATABASE_URL_DIRECT` | string do Session pooler (passo 1.2) |
| `SETUP_TOKEN` | um código seu com 16+ caracteres (ex.: gerado no gerenciador de senhas) |
| `CRON_SECRET` | outro código aleatório com 32+ caracteres |
| `STORAGE_DRIVER` | `supabase` |
| `SUPABASE_URL` | Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | secret key |
| `SUPABASE_STORAGE_BUCKET` | `produtos` |
| `STORAGE_PUBLIC_HOST` | ex.: `abcd1234.supabase.co` |
| `MP_ENVIRONMENT` | `test` |
| `APP_URL` | deixe para o passo 4 |

3. Clique em **Deploy**. O build aplica as migrações e cria os dados iniciais sozinho (dá para ver nos logs: “Migrações aplicadas”).
4. Ao terminar, copie o endereço gerado (ex.: `https://toyville-xyz.vercel.app`). Em **Settings → Environment Variables**, adicione `APP_URL` com esse endereço (sem barra no fim) e faça **Redeploy**.

## 3. Primeiro acesso

1. Abra `https://SEU-ENDERECO/admin/primeiro-acesso`.
2. Informe o `SETUP_TOKEN`, seu nome, e-mail e uma senha (8+ caracteres, letras e números).
3. Você entra direto no painel. A página de primeiro acesso deixa de existir. Opcional: apague a variável `SETUP_TOKEN` na Vercel.
4. No painel, siga a lista **“Pendências para operar”**: configure a retirada (Configurações → Entrega e retirada) e os dados da loja.

## 4. Mercado Pago (depende de conta própria)

Necessário: **conta Mercado Pago da ToyVille** (de preferência PJ, com CNPJ). Com ela:
- Autorize o conector do Mercado Pago nas configurações de conectores do claude.ai; então eu crio a aplicação Checkout Pro, os usuários de teste e cadastro o webhook; **ou**
- Siga `docs/MERCADO_PAGO.md` manualmente.

Depois, na Vercel: `MP_ACCESS_TOKEN` (credencial de **teste**) e `MP_WEBHOOK_SECRET`, e Redeploy. A partir daí é possível fazer compras de teste.

## Observações

- **Agendamentos**: no plano gratuito da Vercel, as rotinas (expirar pedidos não pagos, lembretes de carrinho) rodam 1×/dia — limite do plano. Para vender, no plano Pro, altere em `vercel.json` para de hora em hora (`17 * * * *` e `43 * * * *`).
- **Imagens**: com `STORAGE_DRIVER=supabase`, as fotos vão para o bucket. O envio para o Supabase foi implementado mas **ainda não testado contra o serviço real** — será validado nesta homologação.
- **Dados de demonstração**: não são criados automaticamente. Para ter produtos [DEMO] na homologação, é preciso rodar `npm run db:seed-demo` com acesso ao banco (posso orientar).
- **Uso comercial**: o plano gratuito da Vercel não permite uso comercial. Antes de vender de verdade, migre para o Pro (e o Supabase para Pro, que não pausa).
