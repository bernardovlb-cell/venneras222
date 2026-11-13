# Direção de arte — ToyVille

## Histórico

1. **Versão inicial**: estrutura funcional com aparência de template (hero azul só com texto, categorias com emojis, barra de categorias quebrando em duas linhas no desktop).
2. **Primeira proposta ("a vila dos brinquedos")**: ilustrações vetoriais próprias, cena de castelo no hero, toldo, títulos com marca-texto e sobretítulos com estrelinhas. **Rejeitada pelo proprietário: "muita cara de IA"**. O diagnóstico foi correto: hero com etiqueta + título gigante com palavra destacada + dois botões, sobretítulos com ✦ em toda seção, fundos pontilhados com bolhas desfocadas e ilustrações chapadas que brigam com a logo 3D são hoje a assinatura de páginas geradas automaticamente.
3. **Versão atual ("varejo profissional")**: descrita abaixo.

## Princípios da versão atual

- **A logo é a única peça de imagem da marca.** Nada de ilustrações que concorram com ela. Quando houver fotos reais (produtos e loja), elas ocupam os espaços de imagem.
- **Estrutura de grande varejo**: grade de banners (principal + dois atalhos), compra por idade, categorias em lista de cartões, vitrines com título simples e "Ver todos".
- **Tipografia única** (Nunito, já carregada): títulos em 800 com espaçamento levemente fechado. A fonte arredondada de exibição (Baloo) saiu — em tamanho grande ela deixava tudo com cara infantil/genérica.
- **Cor com limites**: azul estrutura e ações; amarelo só no botão principal e em fundos suaves; vermelho só em preço/promoção; tons suaves para diferenciar blocos. Fundo creme, cartões brancos com borda fina.
- **Ícones de traço** no mesmo desenho dos ícones do site, para categorias (escolhidos pelo nome; categorias novas recebem um ícone neutro). Foto de categoria enviada em Painel > Categorias (editar → "Foto da categoria") substitui o ícone.
- **Menos arredondamento e sem sombras de "peça de brinquedo"**: botões com cantos de 12 px, cartões com borda.
- **Movimento discreto**: só transições de hover e uma entrada suave das seções ao rolar (CSS, desligada com "reduzir movimento").

## Regras de conteúdo

- Nada de produto, avaliação, desconto ou parcelamento inventado no visual.
- "Mais vendidos" só com vendas reais; sem vendas, a seção vira "Destaques da loja" **e o subtítulo de popularidade não aparece**.
- Seções sem produtos ficam ocultas; enquanto o catálogo estiver vazio aparece "Catálogo em cadastro".
- Imagem de criança só com autorização por escrito dos responsáveis.

## Pendências

- **Fotos dos produtos** (fundo branco ou liso). Sem elas os cards mostram "Foto em breve".
- **Fotos da loja física** (fachada, prateleiras): são o que mais daria cara de loja real ao banner principal.
- **Banners de campanha com imagem** (Painel > Conteúdo): com imagem, a arte ocupa o banner principal; sem imagem, banner tipográfico na cor escolhida.
- Testar no Safari de um iPhone real (a revisão foi feita com emulação no Chromium).
