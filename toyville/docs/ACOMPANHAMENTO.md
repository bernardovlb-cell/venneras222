# Acompanhamento do projeto ToyVille

Atualizado em 13/11/2026 (3ª rodada: refinamento visual — ver `docs/DIRECAO-DE-ARTE.md`).

## Funcionalidades concluídas (interface + regra + banco + testes)

**Loja (mobile-first)**
- Cabeçalho com logo, busca com sugestões, conta, favoritos e carrinho com contador; menu de categorias (gaveta no celular, submenus no desktop).
- Home montada pelas seções do painel: banners, categorias, mais vendidos (vira “Destaques da loja” enquanto não houver vendas reais), ofertas relâmpago com contagem regressiva real, ofertas, guia de presentes, lançamentos e diferenciais (oculto até haver benefícios confirmados).
- Busca por nome, marca, descrição e SKU, sem acentos e tolerante a erros de digitação (pg_trgm); filtros combináveis (categoria/subcategoria, idade, marca, faixa de preço, disponibilidade, promoção); ordenação; paginação; painel de filtros inferior no celular; estado sem resultados.
- “Encontre o presente perfeito” por idade, orçamento e categoria, sobre produtos reais.
- Página de produto: galeria com zoom, variações com preço/estoque/imagem próprios, disponibilidade, quantidade, adicionar/comprar agora, favoritos, descrição, segurança, especificações, avaliações moderadas, relacionados, retirada (quando configurada), JSON-LD sem nota inventada.
- Carrinho persistente (cookie + banco), quantidade limitada ao estoque, cupom, descontos, aviso de frete grátis, bloqueio quando um item fica indisponível.
- Checkout como visitante ou logado; frete só de modalidades configuradas; total recalculado no servidor; idempotente; redirecionamento ao Mercado Pago.
- Página do pedido (retorno e acompanhamento) com status vindo do banco, linha do tempo, “pagar agora” enquanto a reserva vale.
- Conta do cliente: cadastro, login, recuperação de senha, perfil, senha, endereços, pedidos, favoritos, atendimentos, exportação e exclusão de dados (LGPD).
- Atendimento: dúvidas, troca, devolução, arrependimento (exige pedido do próprio cliente), reclamação e solicitações LGPD; WhatsApp configurável.
- Páginas institucionais editáveis, com aviso de “texto em revisão” enquanto pendentes.
- Consentimento de cookies: GA4/GTM/Meta Pixel só carregam após opt-in; preferências reabríveis no rodapé.
- SEO: metadados dinâmicos, URLs amigáveis, sitemap (sem produtos [DEMO]), robots, Open Graph, dados estruturados.
- Acessibilidade: rótulos, foco visível, navegação por teclado, contraste conferido, `prefers-reduced-motion`, áreas de toque ≥ 44 px.

**Operação**
- Pedidos com snapshot de valores, reserva de estoque sob bloqueio, idempotência, expiração com reconciliação.
- Mercado Pago Checkout Pro: preferência, webhook com assinatura, deduplicação, consulta à API, todos os status, valor divergente, duplicidade, pago após cancelamento, reembolso.
- Promoções: cupons (percentual, fixo, frete grátis, mínimo, teto, validade, limite total e por cliente, escopo, combinável ou não), descontos automáticos, ofertas relâmpago, preço promocional agendado por variação, frete grátis por valor mínimo; sem empilhamento indevido.
- Estoque por variação com histórico de movimentações.

**Painel administrativo**
- Visão geral (receita aprovada, ticket médio, aguardando pagamento, a separar, cancelados, reembolsos, mais vendidos, estoque baixo, alertas) e **checklist de pendências para operar**.
- Produtos: cadastro, edição, variações, imagens (lote, principal, reordenar, substituir, excluir, texto alternativo), ajuste de estoque, publicar/despublicar/arquivar/excluir.
- Importação CSV/XLSX com modelo, pré-visualização, validação, SKUs duplicados, relatório de erros por linha, atualização segura e transação única.
- Categorias (árvore) e marcas.
- Pedidos: filtros, detalhe, pagamentos, histórico, separação → retirada/envio → entrega, rastreamento, devolução com reposição, cancelamento de não pagos, reembolso, consulta ao Mercado Pago, dados fiscais e notas internas. **Sem opção de marcar como pago.**
- Clientes (com auditoria de visualização), promoções e cupons, conteúdo (banners, seções, páginas), avaliações, atendimento, configurações (loja, marca, WhatsApp, diferenciais, checkout, entrega/retirada, fiscal, analytics, redes, SEO), integrações (mapeamento de SKUs, webhooks recebidos, caixa de e-mails), usuários e permissões por papel, auditoria.

- Recuperação de carrinho: contato gravado só com consentimento no checkout (desmarcar apaga), um único lembrete por carrinho após o prazo configurado, rotina agendada protegida; **desativada por padrão** (Configurações > Checkout).

**Identidade visual** — linha "varejo profissional" (`docs/DIRECAO-DE-ARTE.md`; a proposta ilustrada anterior foi rejeitada por parecer gerada por IA)
- Home: grade de banners (marca ou campanhas do painel + atalhos para guia de presentes e ofertas/novidades), compra por idade, categorias com ícones de traço (ou foto do painel), vitrines com títulos simples, guia de presentes por toques, aviso de "Catálogo em cadastro" enquanto não há produtos.
- Cabeçalho com busca em destaque e menu "Todas as categorias" (a barra não quebra mais em duas linhas); menu do celular com atalhos e ícones; cards de produto com borda, selo de desconto retangular e espaço neutro de "Foto em breve"; tipografia única (Nunito).

## Em implementação / parcial

- E-mail transacional: implementado (Resend) e registrado na caixa de saída; não testado contra o serviço real.
- Armazenamento Supabase: implementado, não testado contra o serviço real (local testado).

## Pendências que dependem do proprietário

1. **Credenciais do Mercado Pago** (teste e produção), chave Pix cadastrada e homologação (`docs/MERCADO_PAGO.md`).
2. **Escolha da hospedagem** (recomendação em `docs/HOSPEDAGEM.md`) e domínio.
3. **Endereço/horário de retirada** e/ou regiões, valores e prazos de entrega; decisão sobre Correios/transportadora.
4. **Textos legais**: aprovar trocas/devoluções, privacidade (dados da empresa e encarregado/DPO), termos, entregas e “Sobre” — os trechos `[PENDENTE]` impedem a publicação.
5. **Dados da empresa** (razão social, CNPJ, e-mail, telefone) e WhatsApp.
6. **Benefícios reais** da loja para a seção de diferenciais.
7. **Catálogo real** (planilha de importação + fotos próprias) e remoção dos dados de demonstração (`npm run db:purge-demo`).
8. **Emissor de NF-e** utilizado (para planejar a integração).
9. **Aprovação da proposta de favicon** (`docs/MARCA.md`) e da nova direção de arte (`docs/DIRECAO-DE-ARTE.md`).
10. Provedor de e-mail e IDs de GA4/GTM/Meta Pixel, se desejar.

## Dependências externas

Mercado Pago · hospedagem Node.js · PostgreSQL gerenciado · armazenamento de imagens · provedor de e-mail · emissor fiscal · Correios/transportadora · Mercado Livre / Amazon / Shopee (cada um com app e autorização próprios — `docs/INTEGRACOES.md`).

## Problemas encontrados e corrigidos durante o desenvolvimento

- O repositório já continha outro site (Venneras). A ToyVille foi criada em `toyville/` sem alterar o existente.
- Vinculação de pedidos de visitante a contas pelo e-mail permitiria ver pedidos alheios (não há verificação de e-mail) → removida.
- Importação sem coluna `status` despublicava produtos ativos → status vazio agora mantém o atual.
- Formulários perdiam o que foi digitado em caso de erro (reset automático do React 19) → envio sem reset.
- `loading.tsx` global fazia páginas inexistentes responderem 200 (soft 404) → removido; produto em rascunho agora responde 404 (testado).
- Submenus do desktop eram cortados por `overflow` → corrigido.
- Logout por GET permitia deslogar a equipe a partir de outro site → apenas POST.
- Driver `postgres` v4 não serializa `Date` em SQL bruto → trocado por operadores tipados.
- Script de teste deixava servidor órfão na porta → encerramento do grupo de processos.
- Modo do Mercado Pago deduzido pelo prefixo `TEST-` classificaria credenciais de teste do Checkout Pro (que começam com `APP_USR-`) como produção → ambiente declarado em `MP_ENVIRONMENT`.
- Agendamentos de hora em hora fariam o deploy falhar no plano gratuito da Vercel (limite de 1×/dia) → diários; instrução para o Pro.
- Publicação exigia terminal (migrações e criação do dono) → migrações e dados iniciais no build da Vercel (testado em banco vazio e repetido sem duplicar) e tela `/admin/primeiro-acesso` protegida por `SETUP_TOKEN` (testada no navegador).
- **Homologação na Vercel travava de forma intermitente** (requisições presas ~60 s e depois erro 500): conexões com o banco morriam enquanto a função ficava suspensa e o driver `postgres` as reutilizava. Trocado para `pg` + `attachDatabasePool` (recomendação da Vercel), com timeouts de conexão/consulta e SSL obrigatório fora do localhost (antes o tráfego com o banco não era criptografado).
- Recuperação de carrinho nunca dispararia (o e-mail só era salvo ao criar o pedido, quando o carrinho já não está abandonado) → contato salvo no consentimento do checkout.
- Pedido sem consentimento mantinha no carrinho um e-mail gravado antes → agora é apagado.
- Contraste insuficiente: selo de desconto vermelho sobre rosa (~4,4:1) e “Você economiza” em verde (~3,6:1) → tons escurecidos (≥ 6:1).
- Requisição 404 de `/favicon.ico` (erro no console) → ícone vazio declarado até a aprovação do favicon.
- Ordem de títulos nas listagens (h1 → h3) e falta de meta description em produtos sem resumo → corrigidos.
- Refinamento visual: grid do hero crescia além da tela no celular (título e botões cortados, sem rolagem horizontal aparente) → colunas `minmax(0,1fr)` e novo teste E2E que procura conteúdo cortado; barra de categorias do desktop quebrava em duas linhas → menu “Todas as categorias”; duas caixas de busca na mesma página repetiam o id `busca` → id único; “Os queridinhos da ToyVille” aparecia mesmo sem vendas → subtítulo de popularidade só com vendas reais; contraste de rótulos conferido (≥ 4,5:1).

## Testes executados (13/11/2026, após o refinamento visual)

| Verificação | Resultado |
|---|---|
| `npm run typecheck` | sem erros |
| `npm run lint` | sem erros e sem avisos |
| `npm run build` | concluído |
| `npm test` — 83 testes (unidade + integração com PostgreSQL real) | 83 passaram |
| `npm run test:e2e` — 25 cenários no navegador (build de produção) | 25 passaram |
| Lighthouse 13 (celular, rede lenta simulada, servidor local, com dados de demonstração) | Início: desempenho mediana 99 em 5 execuções (93 na primeira, servidor frio), TBT 50–140 ms, LCP 0,8 s, CLS 0. Guia de presentes 96, categoria 100, produto 99. Acessibilidade 100 e boas práticas 100 em todas. SEO 100 (produto [DEMO] fica não indexável de propósito) |
| axe-core (WCAG 2 A/AA + boas práticas), celular e desktop | início, presentes, resultado do guia, categoria, busca e produto sem violações |
| Revisão visual com capturas (iPhone SE, iPhone 13, Galaxy S9+, 1440 px) | home com e sem campanhas, com e sem produtos; menus; guia; categoria; produto |

> Lighthouse local não mede a latência real da hospedagem nem imagens reais de produtos. Repetir em produção após o catálogo real (PageSpeed Insights / dados de campo do Chrome).

Cobertura por tema: motor de preços e cupons (38 casos), assinatura do webhook, status do Mercado Pago, parser de importação; criação de pedido, snapshot de preço, idempotência, estoque insuficiente, **concorrência na última unidade**, **limite de cupom sob concorrência**, frete não configurado, entrega local por CEP, frete grátis; pagamento aprovado/pendente/recusado/divergente/duplicado/após cancelamento, expiração com reconciliação, reembolso, separação/entrega, controle de acesso ao pedido; webhook (assinatura válida, inválida, adulterada, ausente, repetida, falha do provedor, tópico ignorado); importação (criação, atualização segura, tudo-ou-nada, SKU de outro produto), estoque abaixo do reservado, variações, arquivamento, promoções inválidas, papéis e permissões, último proprietário, senhas, avaliações (pendente, duplicada, spam), anonimização LGPD.
E2E (novos nesta rodada): nada cortado pela borda no celular (home, presentes, categoria) e guia de presentes por toques até as sugestões.
E2E: login da equipe (erro e sucesso), painel exige login, cliente recebe 404 no painel, configurar retirada, bloqueio de Correios sem integração, cadastro e publicação de produto, importação CSV com erro e com sucesso, busca com erro de digitação, rascunho com 404, carrinho/quantidade/cupom, limite de estoque, checkout de visitante até o Mercado Pago (simulado), URL de retorno falsificada não marca pago, webhook assinado/forjado/repetido, separação e retirada, cron protegido, cadastro sem perder dados, área do cliente, pedido alheio inacessível, ausência de rolagem horizontal em 375 px e 1366 px, sitemap e JSON-LD.

**Não executado**: pagamentos no ambiente de teste real do Mercado Pago (sem rede para `api.mercadopago.com` e sem credenciais neste ambiente); envio real de e-mail; upload para Supabase Storage; Core Web Vitals em produção com dados reais; testes em Safari/Firefox reais (só Chromium, incluindo emulação de iPhone).

## Próximos passos sugeridos

1. Publicar a homologação seguindo `docs/PUBLICAR-HOMOLOGACAO.md`.
2. Criar a conta Mercado Pago da loja (se ainda não houver) e a aplicação Checkout Pro de teste; homologar compras.
2. Contratar banco (Supabase Pro) e hospedagem; publicar a versão de homologação.
3. Preencher configurações, retirada/entrega e textos legais; aprovar políticas.
4. Importar o catálogo real com fotos; remover dados de demonstração.
5. Repetir a auditoria de desempenho em produção, já com fotos reais.
6. Definir provedor de e-mail e ativar os envios.
7. Depois do lançamento: frete por transportadora, integração fiscal, marketplaces.
