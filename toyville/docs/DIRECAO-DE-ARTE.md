# Direção de arte — ToyVille

## Histórico

1. **Versão inicial**: estrutura funcional com aparência de template.
2. **"A vila dos brinquedos"** (ilustrações vetoriais, castelo, toldo, marca-texto): **rejeitada pelo proprietário por parecer gerada por IA**.
3. **"Varejo profissional"**: organizada, mas sem impacto — banner dependente da logo, categorias com ícone + nome + seta.
4. **ToyVille 3.0 (atual)**: direção **fotográfica e comercial, com ludicidade equilibrada**, definida na especificação do proprietário.

## Princípios da versão atual

- **A fotografia é a protagonista.** Banners, categorias e cards são molduras para fotos de brinquedos (recortados ou em ambiente). Texto e botões são sempre elementos reais, nunca embutidos na imagem.
- **Enquanto não há fotos**, os espaços usam substitutos discretos: formas geométricas abstratas da marca no banner principal, disco tom sobre tom + ícone nas categorias, quadro neutro "Foto em breve" nos produtos. Nada figurativo (a proposta ilustrada foi rejeitada) e nenhuma imagem de terceiros ou gerada.
- **A logo oficial não é recriada, recortada nem filtrada.** O arquivo tem fundo branco (sem transparência); no rodapé azul ela fica num selo branco justo. Uma versão com fundo transparente, se o proprietário tiver, permite integrá-la sem o selo.
- **Ritmo por faixas de fundo**: creme → branco → creme → azul suave (guia) → branco/creme (vitrines) → creme (institucional) → amarelo suave (encerramento) → azul (rodapé) → creme (base legal).
- **Cor com limites**: azul = identidade e ações; amarelo = destaque e botão principal sobre azul; vermelho = só preço promocional e ofertas; verde = detalhe.

## Design system (fonte única: `src/app/globals.css`)

| Token | Valor / uso |
|---|---|
| Cores | `--tv-primary`, `--tv-primary-dark`, `--tv-accent`, `--tv-promo`, `--tv-success`, `--tv-bg` (editáveis em Configurações > Marca) + `soft-blue/yellow/green/red`, `sand` (fundo de fotos), `promo-ink`, `success-ink` (texto com contraste) |
| Tipografia | Títulos: **Fredoka** 600 (arredondada, licença SIL OFL, cobre português). Textos, preços e formulários: **Nunito**. O painel administrativo usa só Nunito. |
| Raios | `rounded-ctl` 12 px (botões/campos) · `rounded-card` 20 px · `rounded-panel` 28 px (banners e painéis) |
| Sombras | `shadow-card` (repouso) · `shadow-pop` (painéis flutuantes) · `shadow-lift` (elevação no hover) |
| Movimento | `ease-brand`; transições de 200–500 ms; entrada de seções por rolagem só com suporte e sem "reduzir movimento" |
| Espaçamento | `.tv-section` (respiro vertical fluido entre seções) · `.container-tv` (largura máxima 80 rem) |
| Carrosséis internos | `.tv-rail` (trilho horizontal com encaixe) |
| Breakpoints | sm 640 · md 768 · lg 1024 · xl 1280 (validado em 375, 390, 768, 1024 e 1440 px) |

Formas da marca: `src/components/brand/Shapes.tsx` (círculo, arco, bloco, pílula; versão colorida para o banner principal e tom sobre tom para o resto).

## Estrutura da home (ordem padrão; editável em Conteúdo > Seções)

1. **Banners**: principal em carrossel (~65%) + 2 secundários empilhados (~35%). No celular, o principal em cima e os secundários num carrossel horizontal próprio.
2. **Categorias**: cartões com foto recortada (todas as categorias; a grade mostra 8 e expande; no celular deslizam). Página `/categorias` lista tudo, com subcategorias.
3. **Compre por idade**: cartões numerados com as faixas reais do catálogo (carrossel no celular).
4. **Guia de presentes**: painel com todas as opções visíveis, resumo das escolhas, limpar e validação.
5. **Vitrines** (só com produtos reais): mais vendidos = destaque grande + grade · lançamentos = carrossel · ofertas = painel com grade · relâmpago = painel com carrossel e contagem. Sem produtos, um único estado vazio ocupa o lugar delas.
6. **Institucional**: variedade (contagem real de categorias), loja física (só se houver endereço nas Configurações), atendimento e guia de presentes, mais os diferenciais cadastrados.
7. **Encerramento**: slogan da loja (Configurações > Dados da loja) + convite, com a curva que emenda no rodapé.
8. **Rodapé**: área azul (marca, newsletter, redes, links) + base clara com os dados legais.

## Regras de conteúdo (nunca inventar)

- Selos: desconto só com preço atual < preço de lista; **"Novo"** = cadastrado há até 30 dias (`NEW_PRODUCT_DAYS`); **"Mais vendido"** só na vitrine de mais vendidos e com vendas reais. Avaliações só aparecem quando existem.
- "Mais vendidos" sem vendas vira "Destaques da loja", sem subtítulo de popularidade.
- Imagem de categoria: foto do painel > foto de produto ativo da própria categoria (ou subcategoria) > substituto. Nunca de outra categoria nem de produto de demonstração.
- Redes sociais só aparecem com URL `https://` preenchida; "Pagamentos processados pelo Mercado Pago" só com o Mercado Pago configurado; loja física só com endereço.
- Newsletter só confirma depois de gravar; nenhum e-mail é enviado pelo site.

## Como gerenciar imagens e banners (painel)

| O quê | Onde | Observações |
|---|---|---|
| Campanhas do carrossel | Conteúdo e home → **Carrossel principal** → "+ Nova campanha" | Título, texto, link, botão, cor, **posição do texto** (esquerda, direita ou sobre a foto), **tipo de foto** (brinquedo recortado ou foto de ambiente), foto para computador (~1600×900) e, se quiser, outra para celular (~900×700). ↑ ↓ ordenam; "Prévia" mostra como fica; "Despublicar" tira do ar sem apagar; início/fim agendam. |
| Banners secundários | Conteúdo e home → **Banners secundários** | Aparecem os 2 primeiros publicados. "Novidades" já está criado e despublicado: publique quando houver produtos. |
| Tempo do carrossel | Conteúdo e home → Carrossel principal → "Tempo de cada campanha" | Padrão 6 s (3 a 20). |
| Fotos de categoria | Categorias → Editar → "Foto da categoria" | Quadrada, fundo branco ou transparente. Sem foto, usa a de um produto da categoria. |
| Fotos de produto | Produtos → abrir o produto → Imagens | Fundo branco ou liso; a primeira é a principal. |
| Slogan do encerramento | Configurações → Dados da loja → Slogan | |
| Redes sociais | Configurações → Redes sociais | Endereços completos, começando por `https://`. |
| Newsletter | Menu **Newsletter** (lista, copiar e-mails, remover) · liga/desliga em Conteúdo e home | O site só guarda os e-mails; o envio é feito na ferramenta que a loja escolher. |

**Fotos**: use apenas imagens próprias ou com autorização. Fotos com crianças exigem autorização por escrito dos responsáveis. Para o efeito "recortado", o ideal é PNG/WebP com fundo transparente; fotos com fundo branco também funcionam nos cartões de categoria e de produto.

## Pendências

- **Fotos**: campanhas (brinquedos recortados e fotos de ambiente), categorias, produtos e, se houver, a loja física. É o que falta para a direção fotográfica aparecer de fato.
- Logo com fundo transparente (opcional).
- Mencionar a newsletter na política de privacidade antes de divulgá-la.
- Testar em Safari/iPhone e Firefox reais (a validação foi feita no Chromium, com emulação de celulares).
