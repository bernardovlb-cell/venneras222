# Direção de arte — ToyVille 2.0

## Auditoria (antes)

Capturas da homologação em celular (iPhone 13) e desktop (1440 px):

| Problema | Onde |
|---|---|
| Hero é um retângulo azul com texto e uma estrela translúcida — o “banner genérico” | Home |
| Categorias representadas por emojis, todos no mesmo card repetido | Home |
| Barra de categorias do desktop quebra em duas linhas (“Brinquedos eletrônicos” sozinho) | Cabeçalho |
| Logo pequena (112 px no celular) e sem palco | Cabeçalho |
| Guia de presentes = três `<select>` num card branco | Home e /presentes |
| Sem produtos, a home tem três blocos soltos, sem ritmo nem transições | Home |
| Títulos de seção todos iguais (título + sublinhado amarelo) | Geral |

## Conceito: “A vila dos brinquedos”

ToyVille = *toy* + *ville*. A linguagem visual trata a loja como uma pequena vila de brinquedos, a mesma ideia da logo (castelo, foguete, ursinho):

- **Casinhas** — categorias são fachadas em arco, lado a lado como uma rua (no celular, a rua desliza).
- **Toldo** — borda recortada (festonê) de loja de brinquedos marca o cabeçalho e as transições de seção.
- **Prateleiras** — vitrines de produtos “apoiadas” numa prateleira.
- **Silhueta da vila** — telhados, torre do castelo e foguete no topo do rodapé.
- **Volume de brinquedo** — ilustrações próprias em SVG com sombreamento chapado (face clara/escura, brilho e sombra no chão), como peças de plástico. Botões e cards usam a “sombra de peça” (deslocamento sólido para baixo).

## Tipografia

- Títulos: **Baloo 2** 800, grandes, entrelinha curta; palavra-chave com marca-texto amarelo.
- Sobretítulos (eyebrows) curtos acima de cada seção, em azul, com estrela.
- Texto: **Nunito**. Nenhuma fonte nova (sem custo de carregamento).

## Cor

Mesmos tokens do painel. Fundo creme/branco; azul estrutura; amarelo destaque e CTA principal; vermelho **só** preço/promoção; verde em detalhes das ilustrações e confirmações.

## Regras de conteúdo (inalteradas)

- Ilustrações são desenhos próprios, não representam produtos à venda.
- Categoria com foto enviada no painel mostra a foto no lugar da ilustração.
- “Mais vendidos” só com vendas reais; seções sem produtos reais ficam ocultas.
- Nenhuma promoção, avaliação ou parcelamento é inventado no visual.

## Movimento

Flutuação lenta das ilustrações, entrada de seções ligada à rolagem (CSS `animation-timeline: view()`, sem JavaScript; navegadores sem suporte mostram o conteúdo normalmente), microinterações em botões e cards. Tudo desligado com “reduzir movimento”.

## Onde está no código

| Peça | Arquivo |
|---|---|
| Ilustrações (componentes) e mapeamento categoria → desenho | `src/components/art/ToyArt.tsx` |
| Arquivos estáticos usados nas repetições (cache entre páginas) | `public/art/*.svg` — gerados com `npm run art`; `tests/art.test.ts` falha se ficarem desatualizados |
| Cena do hero (animada, em linha) | `src/components/art/HeroScene.tsx` |
| Silhueta do rodapé | `src/components/art/Decor.tsx` |
| Toldo, marca-texto, adesivo de desconto, movimento | `src/app/globals.css` |
| Home | `src/components/home/HomeSections.tsx` |
| Guia de presentes | `src/components/gift/GiftFinderPanel.tsx`, `GiftFinderForm.tsx` |
| Cabeçalho, menu do celular, busca, rodapé | `src/components/layout/*` |
| Card de produto | `src/components/product/ProductCard.tsx` |

## Pendências

- **Fotos reais**: os cards e o produto mostram “Foto em breve” até o envio das fotos. A direção de arte foi pensada para fotos com fundo branco (o fundo some no tom da vitrine).
- **Fotos de categoria** (opcional): sem foto, cada categoria usa a ilustração própria; com foto (Painel > Categorias), a foto entra na “janela” da casinha.
- **Campanhas**: banners sem imagem usam a cena da vila; com imagem, a arte enviada ocupa o banner inteiro (o texto vai por cima, com degradê).
- Não foi possível abrir o site de referência (Candide) a partir deste ambiente (rede bloqueada); a inspiração ficou na organização (compra por idade, categorias visuais, vitrines), sem consulta direta.
