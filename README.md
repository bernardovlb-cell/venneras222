# Site Venneras

Site da Venneras (curadoria de bolsas femininas), em Next.js + TypeScript + Tailwind.
O site **não processa pagamento**: o botão de compra leva ao checkout da Shopify
(`g2psx0-2d.myshopify.com`) por *cart permalink*, e o pagamento é feito pelo Mercado Pago dentro da Shopify.

## Rodar localmente

Precisa de Node.js 20 ou mais novo.

```bash
npm install
cp .env.example .env.local   # opcional: IDs do GA4 e do Meta Pixel
npm run dev                  # http://localhost:3000
```

Outros comandos:

| Comando | O que faz |
|---|---|
| `npm test` | Testes do checkout e dos preços (`tests/`) |
| `npm run lint` | Checagem de tipos (TypeScript) |
| `npm run build` | Gera o site estático, igual ao que vai para a Vercel |

## Adicionar ou editar um produto

Tudo fica em **`src/data/products.ts`**, no array `produtos`. Hoje ele tem 7 peças **provisórias**
(`pendente(1, "bolsas")` etc.) — troque cada uma por um objeto completo. Há um exemplo comentado no arquivo.

Campos:

- `slug` — vira a URL: `/produto/{slug}`. Só letras minúsculas, números e hífen.
- `nome`, `marca` (ex.: `"Grenobil"`), `categoria` (`"bolsas"`, `"mochilas"` ou `"carteiras"`).
- `preco` em reais (ex.: `199.9`). `precoComparacao` opcional (preço "de", riscado).
- `variantes` — uma por cor: `{ cor: "Preto", shopifyVariantId: "48421367939264", disponivel: true }`.
- `imagens` — `{ src, alt, tipo }`, com `tipo` = `produto`, `uso`, `detalhe` ou `medidas`. A galeria ordena sozinha nessa sequência. O card da coleção troca para a foto `uso` ao passar o mouse.
- `medidas` — `alturaCm`, `larguraCm`, `profundidadeCm`, `alcaCm` (números) e `cabe` (ex.: `"celular, carteira e chaves"`).
- `material`, `compartimentos`, `descricaoCurta`, `descricao`, `cuidados` — texto.

Qualquer campo deixado como `TODO` **não aparece no site**.

### Onde achar o variant ID na Shopify

Admin da Shopify → Produtos → abra o produto → clique na variante (a cor). O número no fim da URL
(`.../variants/48421367939264`) é o `shopifyVariantId`. Use só os dígitos.

Sem variant ID (ou com `TODO`), o botão de compra aparece como **EM BREVE** e fica desabilitado.
Com `disponivel: false` em todas as cores, o produto continua listado com o selo **ESGOTADO**.

## Trocar fotos

| Foto | Arquivo |
|---|---|
| Primeira tela da home | `public/images/hero.jpg` |
| Bloco editorial da home | `public/images/editorial.jpg` |
| Instagram (4 fotos) | `public/images/instagram/1.jpg` … `4.jpg` |
| Página Sobre | `public/images/sobre/1.jpg`, `2.jpg` |
| Produtos | `public/images/produtos/{slug}/…` (e liste em `imagens` no `products.ts`) |
| Logo | `public/brand/logo-horizontal-preto.svg`, `logo-horizontal-branco.svg`, `logo-empilhado-preto.svg`, `icone-concha-preto.svg`, `icone-concha-branco.svg` |
| Favicon | `src/app/icon.svg` (hoje é um "V" provisório; troque pela concha) |

Enquanto o arquivo não existir, o site mostra um bloco cinza "FOTO PENDENTE" na proporção certa.
Os logos entram sozinhos quando os SVGs forem colocados em `public/brand/`.
Fotos de produto em proporção **4:5** (ex.: 1600×2000 px) ficam sem corte.

## Trocar textos e configurações

**`src/config/site.ts`**:

- `whatsappNumero` — só dígitos com DDI e DDD (ex.: `"5521999999999"`). Vazio = os links de WhatsApp somem.
- `pixDescontoPercentual`, `parcelasSemJuros`, `parcelaMinima` — **só exibição**. Precisam bater com a
  configuração real da Shopify (desconto do Pix) e do Mercado Pago (parcelamento), senão o cliente vê um
  preço no site e outro no checkout.
- `freteGratisAcima` — valor em reais, ou `null` para não mostrar.
- `mensagemFaixaTopo` — texto da faixa preta do topo. `null` = monta a partir do Pix e das parcelas.

Textos das páginas:

- Home: `src/app/page.tsx` (título da primeira tela e texto editorial estão marcados `[REVISAR]`).
- Sobre: `src/app/sobre/page.tsx` (`[PREENCHER]`).
- Ajuda: `src/app/ajuda/page.tsx`.
- Políticas: `src/app/politicas/{trocas,privacidade,termos}/page.tsx` — rascunhos `[REVISAR]`, precisam de revisão jurídica.

## Análise (GA4 e Meta Pixel)

Defina na Vercel (Settings → Environment Variables) ou no `.env.local`:

```
NEXT_PUBLIC_GA4_ID=G-XXXXXXXXXX
NEXT_PUBLIC_META_PIXEL_ID=1234567890
```

Sem nenhum ID, nada de análise carrega e o aviso de cookies não aparece. Com ID, os scripts só carregam
depois que a pessoa clica em "Aceitar". Eventos enviados: `view_item`/`ViewContent`, `add_to_cart`/`AddToCart`,
`begin_checkout`/`InitiateCheckout` e `contact` (clique no WhatsApp).

## Publicar (Vercel)

1. Na Vercel: **Add New → Project → Import** o repositório do GitHub. O framework (Next.js) é detectado sozinho.
2. Cada push num branch que não seja o de produção gera um **deploy de preview** com URL própria.
3. Produção: o branch de produção (normalmente `main`) publica em produção. O domínio
   `vennerascomercio.com` é ligado em Settings → Domains.

## Estrutura

```
src/
  app/            páginas (home, coleção, produto, sobre, ajuda, políticas, 404, sitemap, robots)
  components/     header, rodapé, card, galeria, sacola (drawer), banner de cookies
  config/site.ts  configuração central
  data/products.ts catálogo
  lib/checkout.ts monta o permalink da Shopify (com testes em tests/checkout.test.ts)
  lib/pricing.ts  preço no Pix e parcelamento (só exibição)
```
