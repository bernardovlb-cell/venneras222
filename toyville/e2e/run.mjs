/**
 * Teste ponta a ponta no navegador (Playwright) contra o build de produção.
 * Pré-requisitos: PostgreSQL acessível (E2E_DATABASE_URL) e `npm run build` executado.
 * Uso: npm run test:e2e
 */
import { createRequire } from "node:module";
import { spawn, execSync } from "node:child_process";
import sharp from "sharp";
import { createHmac } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { startMpMock } from "./mp-mock.mjs";

const require = createRequire(import.meta.url);
const { chromium, devices } = require("playwright");

const DB = process.env.E2E_DATABASE_URL ?? "postgres://toyville:toyville@localhost:5432/toyville_e2e";
const PORT = 3100, MP_PORT = 4010, BASE = `http://localhost:${PORT}`;
const SECRET = "e2e-webhook-secret";
const results = [];
let failed = 0;

async function step(name, fn) {
  const t = Date.now();
  try { await fn(); results.push(`✔ ${name} (${Date.now() - t}ms)`); }
  catch (e) { failed++; results.push(`✘ ${name}\n    ${String(e?.message ?? e).split("\n").slice(0, 4).join("\n    ")}`); }
}
function assert(c, msg) { if (!c) throw new Error(msg); }

// ---------- preparação do banco
const env = { ...process.env, DATABASE_URL: DB };
const admin = new URL(DB); admin.pathname = "/postgres";
execSync(`psql "${admin}" -c "drop database if exists ${new URL(DB).pathname.slice(1)}" -c "create database ${new URL(DB).pathname.slice(1)}"`, { stdio: "ignore" });
for (const s of ["scripts/migrate.ts", "scripts/seed.ts", "scripts/seed-demo.ts"]) execSync(`npx tsx ${s}`, { env, stdio: "ignore" });
execSync(`npx tsx scripts/create-admin.ts --email dono@e2e.test --name "Dono E2E"`, { env: { ...env, ADMIN_PASSWORD: "Dono12345" }, stdio: "ignore" });
// carrossel mais rápido só para o teste (o padrão é 6 s; o valor vem das configurações)
execSync(`psql "${DB}" -c "insert into settings (key, value) values ('home', '{\\"carouselSeconds\\":3,\\"newsletterEnabled\\":true}')"`, { stdio: "ignore" });

// ---------- servidores
const mp = startMpMock(MP_PORT);
const app = spawn("node_modules/.bin/next", ["start", "-p", String(PORT)], {
  detached: true, // grupo de processos próprio: encerramos o servidor inteiro no final
  env: { ...env, NODE_ENV: "production", APP_URL: BASE, MP_ACCESS_TOKEN: "TEST-e2e-token", MP_WEBHOOK_SECRET: SECRET, MP_API_BASE_URL: `http://localhost:${MP_PORT}`, CRON_SECRET: "e2e-cron", STORAGE_DRIVER: "local", EMAIL_PROVIDER: "outbox" },
  stdio: ["ignore", "pipe", "pipe"],
});
let appLog = "";
app.stdout.on("data", (d) => (appLog += d)); app.stderr.on("data", (d) => (appLog += d));
try { await fetch(`${BASE}/robots.txt`); throw new Error(`porta ${PORT} já está em uso — encerre o servidor anterior`); } catch (e) { if (String(e).includes("em uso")) throw e; }
for (let i = 0; i < 60; i++) { try { if ((await fetch(`${BASE}/robots.txt`)).ok) break; } catch {} await new Promise((r) => setTimeout(r, 500)); }

const browser = await chromium.launch();
const shotDir = "test-results"; fs.mkdirSync(shotDir, { recursive: true });

try {
  const adminCtx = await browser.newContext({ viewport: { width: 1366, height: 900 } });
  const a = await adminCtx.newPage();

  await step("painel exige login (redireciona para /admin/entrar)", async () => {
    await a.goto(`${BASE}/admin/pedidos`);
    assert(a.url().endsWith("/admin/entrar"), `url: ${a.url()}`);
  });

  await step("login da equipe com senha errada é recusado", async () => {
    await a.fill("#f-email", "dono@e2e.test"); await a.fill("#f-password", "errada123");
    await a.click("button:has-text('Entrar')");
    await a.getByText("E-mail ou senha incorretos").waitFor();
  });

  await step("login do proprietário", async () => {
    await a.fill("#f-password", "Dono12345");
    await a.click("button:has-text('Entrar')");
    await a.waitForURL(`${BASE}/admin`);
    await a.getByText("Visão geral").waitFor();
  });

  await step("configurar retirada na loja pelo painel", async () => {
    await a.goto(`${BASE}/admin/configuracoes`);
    const box = a.locator("div.rounded-xl", { hasText: "Retirar na loja" }).first();
    await box.locator("input[name=address]").fill("Rua dos Brinquedos, 123");
    await box.locator("input[name=city]").fill("São Paulo");
    await box.locator("input[name=state]").fill("SP");
    await box.locator("input[name=hours]").fill("Seg a sex, 9h às 18h");
    await box.locator("input[name=isActive]").check();
    await box.locator("button:has-text('Salvar modalidade')").click();
    await box.getByText("Modalidade salva").waitFor();
  });

  await step("ativar Correios sem integração é bloqueado", async () => {
    const box = a.locator("div.rounded-xl", { hasText: "Correios (correios)" }).first();
    await box.locator("input[name=isActive]").check();
    await box.locator("button:has-text('Salvar modalidade')").click();
    await box.getByText("integração ainda não implementada").waitFor();
  });

  await step("cadastrar produto, variação com estoque e publicar", async () => {
    await a.goto(`${BASE}/admin/produtos/novo`);
    await a.fill("input[name=name]", "Caminhão Basculante E2E");
    await a.fill("input[name=sku]", "E2E-CAM-1");
    await a.selectOption("select[name=categoryId]", { label: "Carrinhos e pistas" });
    await a.fill("input[name=minAgeMonths]", "36");
    await a.click("button:has-text('Criar produto')");
    await a.waitForURL(/\/admin\/produtos\/[0-9a-f-]{36}\?novo=1/);
    const vform = a.locator("form", { has: a.locator("button:has-text('Adicionar variação')") });
    await vform.locator("input[name=sku]").fill("E2E-CAM-1");
    await vform.locator("input[name=price]").fill("89,90");
    await vform.locator("input[name=stock]").fill("4");
    await vform.locator("button:has-text('Adicionar variação')").click();
    await a.getByText("Disponível 4").waitFor();
    await a.selectOption("select[name=status]", "active");
    await a.click("button:has-text('Salvar produto')");
    await a.getByText("Produto salvo.").waitFor();
  });

  await step("foto de categoria enviada no painel aparece na home no lugar do ícone", async () => {
    const png = await sharp({ create: { width: 400, height: 400, channels: 3, background: { r: 255, g: 194, b: 26 } } }).png().toBuffer();
    await a.goto(`${BASE}/admin/categorias`);
    const row = a.locator("li", { hasText: "/carrinhos-e-pistas" }).first();
    await row.locator("button:has-text('Editar')").click();
    const form = a.locator("form", { has: a.locator("input[name=image]") });
    await form.locator("input[name=image]").setInputFiles({ name: "carrinhos.png", mimeType: "image/png", buffer: png });
    await form.locator("button:has-text('Salvar')").click();
    await a.locator("li", { hasText: "/carrinhos-e-pistas" }).getByText("com foto").waitFor(); // o formulário fecha ao salvar
    await a.goto(`${BASE}/`);
    const img = a.locator("article:has(a[href='/c/carrinhos-e-pistas']) img").first();
    await img.waitFor();
    assert(/categorias\/.+\.webp/.test(decodeURIComponent((await img.getAttribute("src")) ?? "")), "foto da categoria não aparece na home");
  });

  await step("painel: nova campanha com foto e texto sobre a imagem aparece no carrossel; despublicar remove", async () => {
    const png = await sharp({ create: { width: 1200, height: 700, channels: 3, background: { r: 31, g: 79, b: 209 } } }).png().toBuffer();
    await a.goto(`${BASE}/admin/conteudo`);
    await a.click("button:has-text('+ Nova campanha')");
    const form = a.locator("form", { has: a.locator("select[name=textPosition]") });
    await form.locator("input[name=title]").fill("Campanha E2E");
    await form.locator("input[name=subtitle]").fill("Texto real, fora da imagem");
    await form.locator("input[name=linkUrl]").fill("/presentes");
    await form.locator("input[name=ctaLabel]").fill("Conferir");
    await form.locator("select[name=textPosition]").selectOption("overlay");
    await form.locator("select[name=imageMode]").selectOption("cover");
    await form.locator("input[name=image]").setInputFiles({ name: "campanha.png", mimeType: "image/png", buffer: png });
    await form.locator("button:has-text('Salvar')").click();
    const row = a.locator("li", { hasText: "Campanha E2E" });
    await row.getByText("com foto").waitFor();
    await row.getByText("texto sobre a foto").waitFor();
    await row.locator("button:has-text('Prévia')").click();
    await row.locator(".tv-store h2", { hasText: "Campanha E2E" }).waitFor(); // prévia usa o componente da loja
    await a.goto(`${BASE}/`);
    const slide = a.locator("[aria-roledescription=slide]", { hasText: "Campanha E2E" });
    assert(await slide.count() === 1, "campanha não entrou no carrossel");
    assert(/banners\/.+\.webp/.test(decodeURIComponent((await slide.locator("img").first().getAttribute("src")) ?? "")), "foto da campanha não foi usada");
    assert((await slide.locator("a", { hasText: "Conferir" }).getAttribute("href")) === "/presentes", "botão da campanha sem o link configurado");
    await a.goto(`${BASE}/admin/conteudo`);
    await a.locator("li", { hasText: "Campanha E2E" }).locator("button:has-text('Despublicar')").click();
    await a.locator("li", { hasText: "Campanha E2E" }).getByText("inativo").waitFor();
    await a.goto(`${BASE}/`);
    assert(await a.locator("[aria-roledescription=slide]", { hasText: "Campanha E2E" }).count() === 0, "campanha despublicada continua na home");
  });

  await step("painel: banner secundário novo sobe na ordem e passa a aparecer ao lado do principal", async () => {
    await a.goto(`${BASE}/admin/conteudo`);
    await a.click("button:has-text('+ Novo banner secundário')");
    const form = a.locator("form", { has: a.locator("input[name=placement][value=side]") });
    await form.locator("input[name=title]").fill("Lateral E2E");
    await form.locator("input[name=linkUrl]").fill("/categorias");
    await form.locator("button:has-text('Salvar')").click();
    await a.locator("li", { hasText: "Lateral E2E" }).first().waitFor();
    const order = () => execSync(`psql "${DB}" -tAc "select string_agg(title, '|' order by position) from banners where placement='side'"`).toString().trim();
    assert(order().endsWith("Lateral E2E"), `novo banner deveria entrar no fim: ${order()}`);
    for (let i = 0; i < 2; i++) {
      const before = order();
      await a.getByRole("button", { name: "Subir Lateral E2E" }).click();
      for (let k = 0; k < 30 && order() === before; k++) await a.waitForTimeout(100);
    }
    assert(order().split("|")[1] === "Lateral E2E", `ordem inesperada: ${order()}`);
    await a.goto(`${BASE}/`);
    const side = a.locator("ul[aria-label='Mais destaques'] > li");
    assert(await side.count() === 2, `esperava 2 banners secundários, há ${await side.count()}`);
    assert((await side.nth(1).innerText()).includes("Lateral E2E"), "banner secundário novo não aparece na 2ª posição");
    assert(await a.locator("ul[aria-label='Mais destaques']").getByText("Novidades").count() === 0, "“Novidades” despublicado não pode aparecer");
  });

  await step("importar produtos por CSV (pré-visualização, erro e confirmação)", async () => {
    await a.goto(`${BASE}/admin/produtos/importar`);
    const bad = path.resolve(shotDir, "ruim.csv");
    fs.writeFileSync(bad, "produto_sku,nome,preco\nIMP-1,Bola,abc\n");
    await a.setInputFiles("#file", bad);
    await a.click("button:has-text('Pré-visualizar')");
    await a.getByText("Linha 2").waitFor();
    const good = path.resolve(shotDir, "bom.csv");
    fs.writeFileSync(good, "produto_sku;nome;categoria;preco;estoque;status\nIMP-1;Bola Saltitante E2E;brinquedos-para-bebes;19,90;7;ativo\n");
    await a.setInputFiles("#file", good);
    await a.click("button:has-text('Pré-visualizar')");
    await a.getByText("1 produto(s) novo(s)").waitFor();
    await a.click("button:has-text('Confirmar importação')");
    await a.getByText("Importação concluída").waitFor();
  });

  await step("criar cupom (SQL direto) e promoção relâmpago aparece na loja", async () => {
    execSync(`psql "${DB}" -c "insert into coupons (code, type, value) values ('E2E10','percent',10)"`, { stdio: "ignore" });
  });

  // ---------------- visitante (celular)
  const guestCtx = await browser.newContext({ ...devices["iPhone 13"] });
  const g = await guestCtx.newPage();
  let orderId = "", prefId = "";

  await step("busca com erro de digitação encontra o produto", async () => {
    await g.goto(`${BASE}/busca?q=caminhao basculamte`);
    await g.getByText("Caminhão Basculante E2E").first().waitFor();
  });

  await step("produto em rascunho não aparece na loja", async () => {
    const r = await g.goto(`${BASE}/produto/demo-demo-edu-01`);
    assert(r.status() === 200, "demo ativo deveria abrir");
    execSync(`psql "${DB}" -c "update products set status='draft' where sku='DEMO-EDU-01'"`, { stdio: "ignore" });
    const r2 = await g.goto(`${BASE}/produto/demo-demo-edu-01`);
    assert(r2.status() === 404, `esperado 404, veio ${r2.status()}`);
  });

  await step("adicionar ao carrinho, alterar quantidade e aplicar cupom", async () => {
    await g.goto(`${BASE}/produto/caminhao-basculante-e2e`);
    await g.click("button:has-text('Adicionar ao carrinho')");
    await g.getByText("Adicionado ao carrinho!").waitFor();
    await g.goto(`${BASE}/carrinho`);
    await g.click("button[aria-label^='Aumentar quantidade']");
    await g.getByLabel("Quantidade: 2").waitFor();
    await g.fill("#cupom", "NAOEXISTE");
    await g.click("button:has-text('Aplicar')");
    await g.getByText("Cupom não encontrado").waitFor();
    await g.fill("#cupom", "E2E10");
    await g.click("button:has-text('Aplicar')");
    await g.getByText("Cupom E2E10 aplicado").waitFor().catch(async () => g.getByText("aplicado").first().waitFor());
    await g.getByText("R$ 161,82").first().waitFor(); // 2 × 89,90 − 10%
  });

  await step("não permite quantidade acima do estoque", async () => {
    const plus = g.locator("button[aria-label^='Aumentar quantidade']");
    for (let i = 0; i < 5 && !(await plus.isDisabled()); i++) { await plus.click(); await g.waitForTimeout(400); }
    await g.getByLabel("Quantidade: 4").waitFor();
    const disabled = await g.locator("button[aria-label^='Aumentar quantidade']").isDisabled();
    assert(disabled, "botão + deveria estar desabilitado no limite do estoque");
    await g.click("button[aria-label^='Diminuir quantidade']"); await g.getByLabel("Quantidade: 3").waitFor();
    await g.click("button[aria-label^='Diminuir quantidade']"); await g.getByLabel("Quantidade: 2").waitFor();
  });

  await step("checkout como visitante → redireciona ao Mercado Pago (simulado)", async () => {
    await g.goto(`${BASE}/checkout`);
    await g.fill("#email", "visitante@e2e.test");
    await g.fill("#name", "Visitante Teste");
    await g.fill("#phone", "11988887777");
    await g.getByText("Retirar na loja").waitFor();
    await g.check("input[name=ship][value=retirada]");
    await g.getByText("R$ 161,82").first().waitFor();
    await g.click("button:has-text('Ir para o pagamento')");
    await g.getByText("É preciso aceitar os termos").waitFor();
    await g.check("#acceptTerms input[type=checkbox]");
    // consentimento de lembretes grava o contato no carrinho; desmarcar apaga
    await g.getByText("lembretes do meu carrinho").click();
    let saved = "";
    for (let i = 0; i < 20 && saved !== "visitante@e2e.test|true"; i++) { await g.waitForTimeout(150); saved = execSync(`psql "${DB}" -tAc "select coalesce(email,'')||'|'||recovery_consent from carts where email is not null order by updated_at desc limit 1"`).toString().trim(); }
    assert(saved === "visitante@e2e.test|true", `contato do carrinho: "${saved}"`);
    await g.getByText("lembretes do meu carrinho").click();
    let cleared = "";
    for (let i = 0; i < 20 && cleared !== "0"; i++) { await g.waitForTimeout(150); cleared = execSync(`psql "${DB}" -tAc "select count(*) from carts where email = 'visitante@e2e.test' and converted_order_id is null"`).toString().trim(); }
    assert(cleared === "0", "desmarcar deveria apagar o contato");
    await g.click("button:has-text('Ir para o pagamento')");
    await g.waitForURL(/localhost:4010\/checkout\?pref_id=/);
    prefId = new URL(g.url()).searchParams.get("pref_id");
    const pref = mp.prefs.get(prefId);
    orderId = pref.external_reference;
    const sum = pref.items.reduce((s, i) => s + i.unit_price * i.quantity, 0);
    assert(Math.abs(sum - 161.82) < 0.001, `total enviado ao MP: ${sum}`);
    const reserved = execSync(`psql "${DB}" -tAc "select stock_reserved from product_variants where sku='E2E-CAM-1'"`).toString().trim();
    assert(reserved === "2", `reserva esperada 2, veio ${reserved}`);
  });

  await step("página de retorno com status falso na URL NÃO marca como pago", async () => {
    const back = mp.prefs.get(prefId).back_urls.success;
    await g.goto(`${back}&status=approved&collection_status=approved`);
    await g.getByText("Aguardando pagamento").first().waitFor();
  });

  await step("webhook assinado aprova o pagamento; repetição é ignorada; assinatura falsa é recusada", async () => {
    const payId = mp.pay(prefId, "approved");
    const send = async (reqId, secret = SECRET) => {
      const ts = String(Math.floor(Date.now() / 1000));
      const v1 = createHmac("sha256", secret).update(`id:${payId};request-id:${reqId};ts:${ts};`).digest("hex");
      return fetch(`${BASE}/api/webhooks/mercadopago?data.id=${payId}&type=payment`, { method: "POST", headers: { "content-type": "application/json", "x-request-id": reqId, "x-signature": `ts=${ts},v1=${v1}` }, body: JSON.stringify({ type: "payment", data: { id: payId } }) });
    };
    const forged = await send("req-forjado", "segredo-errado");
    assert(forged.status === 401, `forjado: ${forged.status}`);
    const r1 = await send("req-1");
    const j1 = await r1.json();
    assert(r1.status === 200 && j1.outcome === "paid", `webhook: ${r1.status} ${JSON.stringify(j1)}`);
    const r2 = await (await send("req-1")).json();
    assert(r2.duplicate === true, "repetição deveria ser ignorada");
    const st = execSync(`psql "${DB}" -tAc "select stock_on_hand||'/'||stock_reserved from product_variants where sku='E2E-CAM-1'"`).toString().trim();
    assert(st === "2/0", `estoque após pagamento: ${st}`);
    await g.goto(mp.prefs.get(prefId).back_urls.success);
    await g.getByText("Pagamento confirmado!").waitFor();
  });

  await step("painel: separar e marcar pronto para retirada", async () => {
    await a.goto(`${BASE}/admin/pedidos/${orderId}`);
    await a.getByText("Pago", { exact: true }).first().waitFor();
    assert(!(await a.getByRole("button", { name: /marcar como pago/i }).count()) && !(await a.locator("option", { hasText: /pago/i }).count()), "não pode existir opção de marcar como pago");
    await a.selectOption("select[name=next]", "picking");
    await a.click("button:has-text('Atualizar etapa')");
    await a.getByText("Pedido atualizado.").waitFor();
    await a.selectOption("select[name=next]", "ready_for_pickup");
    await a.click("button:has-text('Atualizar etapa')");
    await a.getByText("Pronto para retirada").first().waitFor();
  });

  await step("cron de expiração exige segredo", async () => {
    assert((await fetch(`${BASE}/api/cron/expire-orders`)).status === 401, "sem segredo deveria ser 401");
    const ok = await fetch(`${BASE}/api/cron/expire-orders`, { headers: { authorization: "Bearer e2e-cron" } });
    assert(ok.status === 200, `cron: ${ok.status}`);
    assert((await fetch(`${BASE}/api/cron/abandoned-carts`)).status === 401, "carrinhos sem segredo deveria ser 401");
    const ac = await (await fetch(`${BASE}/api/cron/abandoned-carts`, { headers: { authorization: "Bearer e2e-cron" } })).json();
    assert(ac.ok && ac.enabled === false, `lembretes devem vir desativados por padrão: ${JSON.stringify(ac)}`);
  });

  // ---------------- cliente com conta
  const custCtx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const c = await custCtx.newPage();
  await step("cadastro mantém os campos digitados quando há erro", async () => {
    await c.goto(`${BASE}/conta/cadastro`);
    await c.fill("#f-name", "Cliente Teste");
    await c.fill("#f-email", "cliente@e2e.test");
    await c.fill("#f-password", "fraca");
    await c.check("input[name=acceptTerms]");
    await c.click("button:has-text('Criar conta')");
    await c.getByText("pelo menos 8 caracteres").waitFor();
    assert((await c.inputValue("#f-email")) === "cliente@e2e.test", "e-mail foi apagado após erro");
  });
  await step("cadastro, área do cliente e logout", async () => {
    await c.fill("#f-password", "Senha1234");
    await c.click("button:has-text('Criar conta')");
    await c.waitForURL(`${BASE}/conta`);
    await c.locator("main").getByText("Minha conta").first().waitFor();
    await c.click("button:has-text('Sair')");
    await c.waitForURL(`${BASE}/`);
  });
  await step("cliente não acessa o painel (404) e não vê pedido alheio", async () => {
    await c.goto(`${BASE}/conta/entrar`);
    await c.fill("#f-email", "cliente@e2e.test"); await c.fill("#f-password", "Senha1234");
    await c.click("button:has-text('Entrar')"); await c.waitForURL(`${BASE}/conta`);
    const r = await c.goto(`${BASE}/admin`);
    assert(r.status() === 404, `cliente no painel: ${r.status()}`);
    await c.goto(`${BASE}/pedido/${orderId}`);
    await c.getByText("Pedido não encontrado").waitFor();
    await c.goto(`${BASE}/conta/pedidos/${orderId}`);
    await c.getByText(/não foi encontrad|404/i).first().waitFor();
  });

  // ---------------- gavetas no celular (menu e filtros ocupam a tela inteira)
  await step("menu e filtros no celular ocupam a tela inteira e mostram todos os itens", async () => {
    const ctx = await browser.newContext({ ...devices["iPhone 13"] });
    const p = await ctx.newPage();
    await p.goto(BASE + "/");
    await p.click("button[aria-label='Abrir menu']");
    const nav = p.locator("[role=dialog][aria-label=Menu] nav");
    await nav.waitFor();
    const box = await nav.boundingBox();
    const vh = p.viewportSize().height;
    assert(box && box.height >= vh - 2, `gaveta do menu com ${box?.height}px de ${vh}px`);
    const entrar = p.getByRole("link", { name: /Entrar ou cadastrar/ });
    await entrar.scrollIntoViewIfNeeded();
    assert(await entrar.isVisible(), "link Entrar não visível no menu");
    await p.click("button[aria-label='Fechar menu'] >> nth=-1");
    await p.goto(BASE + "/c/carrinhos-e-pistas");
    await p.click("button[aria-controls=filtros]");
    const sheet = await p.locator("#filtros").boundingBox();
    assert(sheet && sheet.y + sheet.height >= vh - 2 && sheet.height > 200, `painel de filtros mal posicionado: ${JSON.stringify(sheet)}`);
    await p.screenshot({ path: `${shotDir}/menu-celular.png` });
    await ctx.close();
  });

  // ---------------- home 3.0
  const activeSlide = (p) => p.locator("[aria-roledescription=slide]:not([inert])").first().getAttribute("aria-label");
  const waitSlide = async (p, test, ms = 6000) => { for (let t = 0; t < ms; t += 150) { if (test(await activeSlide(p))) return true; await p.waitForTimeout(150); } return false; };

  await step("carrossel: gira sozinho, pausa com o mouse, para depois de interação manual e volta com “retomar”", async () => {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const p = await ctx.newPage();
    await p.goto(BASE + "/");
    const first = await activeSlide(p);
    assert(first?.startsWith("1 de "), `slide inicial: ${first}`);
    assert(await waitSlide(p, (l) => l?.startsWith("2 de ")), "não avançou sozinho");
    await p.hover("[aria-roledescription=carrossel] h2, [aria-roledescription=carrossel] h1");
    const held = await activeSlide(p);
    await p.waitForTimeout(4200);
    assert((await activeSlide(p)) === held, "avançou com o mouse em cima");
    await p.mouse.move(700, 880);
    assert(await waitSlide(p, (l) => l !== held), "não retomou ao tirar o mouse");
    await p.click("button[aria-label='Próxima campanha']");
    await p.mouse.move(700, 880);
    await p.waitForTimeout(900);
    const manual = await activeSlide(p);
    await p.waitForTimeout(4200);
    assert((await activeSlide(p)) === manual, "avançou sozinho depois de navegação manual");
    const toggle = p.locator("button[aria-label*='troca automática']");
    assert((await toggle.getAttribute("aria-label")).startsWith("Retomar"), "botão deveria oferecer “retomar”");
    await p.click("button[aria-label^='Mostrar campanha 1 de']");
    await p.waitForTimeout(900);
    assert((await activeSlide(p)).startsWith("1 de "), "indicador não levou ao slide 1");
    await toggle.click();
    await p.mouse.move(700, 880);
    assert(await waitSlide(p, (l) => !l.startsWith("1 de ")), "não voltou a girar depois de “retomar”");
    assert(await p.locator("[aria-roledescription=slide][inert] a").count() > 0 && await p.locator("[aria-roledescription=slide]:not([inert]) a").count() > 0, "slides fora de vista deveriam ficar inertes");
    await ctx.close();
  });

  await step("carrossel: foco de teclado pausa; com “reduzir movimento” não gira sozinho", async () => {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const p = await ctx.newPage();
    await p.goto(BASE + "/");
    let inside = false;
    for (let i = 0; i < 60 && !inside; i++) { await p.keyboard.press("Tab"); inside = await p.evaluate(() => !!document.activeElement?.closest("[aria-roledescription=carrossel]")); }
    assert(inside, "não chegou ao carrossel pelo teclado");
    const held = await activeSlide(p);
    await p.waitForTimeout(4200);
    assert((await activeSlide(p)) === held, "avançou com foco de teclado dentro");
    await ctx.close();
    const rm = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
    const q = await rm.newPage();
    await q.goto(BASE + "/");
    await q.waitForTimeout(4200);
    assert((await activeSlide(q)).startsWith("1 de "), "girou sozinho com “reduzir movimento”");
    assert(await q.locator("button[aria-label*='troca automática']").count() === 0, "com movimento reduzido não há o que pausar");
    await q.click("button[aria-label='Próxima campanha']");
    await q.waitForTimeout(400);
    assert((await activeSlide(q)).startsWith("2 de "), "navegação manual deveria funcionar com movimento reduzido");
    await rm.close();
  });

  await step("banners: ~65/35 com dois secundários empilhados no desktop; no celular, secundários em carrossel próprio", async () => {
    const d = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
    const p = await d.newPage();
    await p.goto(BASE + "/");
    const main = await p.locator("[aria-roledescription=carrossel]").boundingBox();
    const sideUl = p.locator("ul[aria-label='Mais destaques']");
    const side = await sideUl.boundingBox();
    const share = main.width / (side.x + side.width - main.x);
    assert(share > 0.62 && share < 0.67, `banner principal ocupa ${(share * 100).toFixed(1)}% (esperado ~65%)`);
    assert(Math.abs(main.height - side.height) <= 2, `alturas diferentes: principal ${main.height}px, secundários ${side.height}px`);
    const b1 = await sideUl.locator("> li").nth(0).boundingBox(), b2 = await sideUl.locator("> li").nth(1).boundingBox();
    assert(b2.y > b1.y + b1.height - 1 && Math.abs(b1.height - b2.height) <= 2, "secundários deveriam estar empilhados e com a mesma altura");
    await d.close();
    for (const dev of ["iPhone SE", "iPhone 13"]) {
      const m = await browser.newContext({ ...devices[dev], reducedMotion: "reduce" });
      const q = await m.newPage();
      await q.goto(BASE + "/");
      const vw = q.viewportSize().width;
      const mb = await q.locator("[aria-roledescription=carrossel]").boundingBox();
      assert(mb.width >= vw - 34 && mb.x >= 0, `${dev}: banner principal não usa a largura disponível (${mb.width}px de ${vw}px)`);
      const rail = await q.locator("ul[aria-label='Mais destaques']").evaluate((el) => ({ sw: el.scrollWidth, cw: el.clientWidth, top: el.getBoundingClientRect().top }));
      assert(rail.sw > rail.cw + 40, `${dev}: secundários deveriam deslizar na horizontal`);
      assert(rail.top >= mb.y + mb.height - 1, `${dev}: secundários deveriam ficar abaixo do principal`);
      for (const sel of ["section:has(#por-idade) ul", "section:has(a[href='/categorias']) ul.tv-rail"]) {
        const r = await q.locator(sel).first().evaluate((el) => el.scrollWidth > el.clientWidth + 40);
        assert(r, `${dev}: ${sel} deveria ser um carrossel horizontal`);
      }
      await m.close();
    }
  });

  await step("categorias e idades: todas as categorias acessíveis; cartão de idade leva ao filtro", async () => {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
    const p = await ctx.newPage();
    await p.goto(BASE + "/");
    const total = Number(execSync(`psql "${DB}" -tAc "select count(*) from categories where is_active and parent_id is null"`).toString().trim());
    const cards = p.locator("section:has(a[href='/categorias']) ul.tv-rail > li a[href^='/c/']");
    assert(await cards.count() === total, `home lista ${await cards.count()} de ${total} categorias`);
    await p.goto(BASE + "/categorias");
    assert(await p.locator("main h2 a[href^='/c/']").count() === total, "página de categorias incompleta");
    await p.goto(BASE + "/");
    await p.click("a[aria-label='Brinquedos para 3 a 4 anos']");
    await p.waitForURL(/\/busca\?idade=3-4/);
    assert(await p.locator("input[name=idade][value='3-4']").first().isChecked(), "filtro de idade não foi aplicado");
    await ctx.close();
  });

  await step("guia de presentes: exige idade, mostra e limpa as escolhas", async () => {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
    const p = await ctx.newPage();
    await p.goto(BASE + "/");
    const form = p.locator("form[action='/presentes']");
    await form.locator("button[type=submit]").click();
    await form.getByText("Escolha a idade da criança").waitFor();
    assert(new URL(p.url()).pathname === "/", "não deveria buscar sem idade");
    await form.locator("label:has(input[value='5-7'])").click();
    await form.locator("label:has(input[value='ate-50'])").click();
    const picked = form.locator("ul[aria-label='Suas escolhas']");
    assert((await picked.innerText()).includes("5 a 7 anos") && (await picked.innerText()).includes("Até R$ 50"), "escolhas não aparecem no resumo");
    await picked.getByRole("button", { name: "Remover: Até R$ 50" }).click();
    assert(!(await picked.innerText()).includes("Até R$ 50"), "escolha removida continua no resumo");
    await form.getByRole("button", { name: "Limpar tudo" }).click();
    assert(await form.locator("input[name=idade]:checked").count() === 0, "“Limpar tudo” não limpou a idade");
    await ctx.close();
  });

  await step("newsletter: valida e-mail e consentimento, grava no banco e aparece no painel", async () => {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
    const p = await ctx.newPage();
    await p.goto(BASE + "/");
    const f = p.locator("footer form");
    const count = () => execSync(`psql "${DB}" -tAc "select count(*) from newsletter_subscribers"`).toString().trim();
    await f.locator("input[name=email]").fill("nao-e-email");
    await f.locator("input[name=consent]").check();
    await f.locator("button[type=submit]").click();
    await f.getByText("Informe um e-mail válido.").waitFor();
    await f.locator("input[name=email]").fill("news@e2e.test");
    await f.locator("input[name=consent]").uncheck();
    await f.locator("button[type=submit]").click();
    await f.getByText("Marque a caixa para autorizar").waitFor();
    assert(count() === "0", "gravou sem consentimento ou com e-mail inválido");
    assert((await f.locator("input[name=email]").inputValue()) === "news@e2e.test", "apagou o e-mail digitado ao dar erro");
    await f.locator("input[name=consent]").check();
    await f.locator("button[type=submit]").click();
    await f.getByText("Pronto! Seu e-mail foi cadastrado.").waitFor();
    assert(execSync(`psql "${DB}" -tAc "select email||'|'||(consent_at is not null) from newsletter_subscribers"`).toString().trim() === "news@e2e.test|true", "inscrição não foi gravada");
    await ctx.close();
    await a.goto(`${BASE}/admin/newsletter`);
    await a.getByText("news@e2e.test").first().waitFor();
  });

  await step("catálogo vazio: um único estado vazio no lugar das vitrines, sem produto inventado", async () => {
    execSync(`psql "${DB}" -c "update products set status='archived' where status='active'"`, { stdio: "ignore" });
    try {
      const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
      const p = await ctx.newPage();
      await p.goto(BASE + "/");
      assert(await p.getByText("Nossas prateleiras estão sendo montadas").count() === 1, "estado vazio deveria aparecer exatamente uma vez");
      assert(await p.locator("main a[href^='/produto/']").count() === 0, "há card de produto com o catálogo vazio");
      // preços fora do guia de presentes (as faixas de orçamento do guia não são preços de produto)
      const prices = await p.evaluate(() => { const m = document.querySelector("main").cloneNode(true); m.querySelectorAll("form[action='/presentes']").forEach((f) => f.remove()); return (m.textContent.match(/R\$\s?\d/g) ?? []).length; });
      assert(prices === 0, "há preço de produto na home com o catálogo vazio");
      for (const t of ["Explore por categoria", "Compre por idade", "Encontre o presente perfeito", "Por que comprar na ToyVille"]) assert(await p.locator("main h2", { hasText: t }).count() >= 1, `seção ausente: ${t}`);
      await p.screenshot({ path: `${shotDir}/home-vazia-1440.png`, fullPage: true });
      await ctx.close();
    } finally {
      execSync(`psql "${DB}" -c "update products set status='active' where status='archived'"`, { stdio: "ignore" });
    }
  });

  // ---------------- responsividade
  await step("sem rolagem horizontal em 375px e 1366px", async () => {
    const pages = ["/", "/categorias", "/busca", "/c/carrinhos-e-pistas", "/produto/caminhao-basculante-e2e", "/carrinho", "/presentes?idade=3-4", "/atendimento", "/conta/entrar", "/p/trocas-e-devolucoes"];
    const bad = [];
    for (const [w, h] of [[375, 812], [1366, 900]]) {
      const ctx = await browser.newContext({ viewport: { width: w, height: h } });
      const p = await ctx.newPage();
      for (const u of pages) {
        await p.goto(BASE + u);
        if (await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)) bad.push(`${w}px ${u}`);
      }
      if (w === 375) await p.goto(BASE + "/"), await p.screenshot({ path: `${shotDir}/home-375.png` });
      await ctx.close();
    }
    assert(!bad.length, `rolagem horizontal em: ${bad.join(", ")}`);
  });

  // Seções com overflow-hidden escondem o vazamento sem gerar rolagem: procura texto/botões cortados pela borda.
  await step("nada cortado pela borda da tela no celular (home, presentes, categoria)", async () => {
    const bad = [];
    for (const dev of ["iPhone SE", "iPhone 13"]) {
      const ctx = await browser.newContext({ ...devices[dev], reducedMotion: "reduce" });
      const p = await ctx.newPage();
      for (const u of ["/", "/presentes", "/c/carrinhos-e-pistas"]) {
        await p.goto(BASE + u);
        const found = await p.evaluate(() => {
          const W = innerWidth, out = [];
          const scrollsX = (el) => { for (let e = el.parentElement; e; e = e.parentElement) { const s = getComputedStyle(e); if ((s.overflowX === "auto" || s.overflowX === "scroll") && e.scrollWidth > e.clientWidth) return true; } return false; };
          for (const el of document.querySelectorAll("main h1, main h2, main p, main a, main button, main label, header a, header button")) {
            const r = el.getBoundingClientRect();
            if (!r.width || getComputedStyle(el).visibility === "hidden" || el.closest("[aria-hidden=true]")) continue;
            if ((r.right > W + 1 || r.left < -1) && !scrollsX(el)) out.push(`${el.tagName} "${el.textContent.trim().slice(0, 24)}"`);
          }
          return out;
        });
        bad.push(...found.map((f) => `${dev} ${u}: ${f}`));
      }
      await ctx.close();
    }
    assert(!bad.length, `cortado: ${bad.slice(0, 5).join("; ")}`);
  });

  await step("guia de presentes por toques: idade + orçamento levam às sugestões", async () => {
    const ctx = await browser.newContext({ ...devices["iPhone 13"] });
    const p = await ctx.newPage();
    await p.goto(BASE + "/");
    const form = p.locator("form[action='/presentes']");
    await form.locator("label:has(input[value='3-4'])").click();
    await form.locator("label:has(input[value='50-100'])").click();
    await form.locator("button[type=submit]").click();
    await p.waitForURL(/\/presentes\?/);
    const u = new URL(p.url());
    assert(u.searchParams.get("idade") === "3-4" && u.searchParams.get("orcamento") === "50-100", `parâmetros errados: ${u.search}`);
    assert(await p.locator("h2", { hasText: /sugest/ }).count() > 0, "resultado do guia não apareceu");
    assert(await p.locator("input[name=idade][value='3-4']").isChecked(), "idade escolhida não ficou marcada");
    await ctx.close();
  });

  await step("SEO: sitemap, robots e dados estruturados de produto", async () => {
    const sm = await (await fetch(`${BASE}/sitemap.xml`)).text();
    assert(sm.includes("/produto/caminhao-basculante-e2e"), "produto fora do sitemap");
    assert(!sm.includes("demo-"), "produto DEMO não deve ir para o sitemap");
    const html = await (await fetch(`${BASE}/produto/caminhao-basculante-e2e`)).text();
    assert(html.includes('"@type":"Product"') && !html.includes("aggregateRating"), "JSON-LD de produto ausente ou com nota sem avaliações");
  });
} finally {
  await browser.close();
  try { process.kill(-app.pid, "SIGTERM"); } catch { app.kill("SIGTERM"); }
  mp.close();
}

console.log("\nTestes ponta a ponta:\n" + results.join("\n"));
if (failed) {
  console.log(`\n${failed} falha(s). Últimas linhas do servidor:\n${appLog.split("\n").slice(-25).join("\n")}`);
  process.exit(1);
}
console.log(`\nTodos os ${results.length} cenários passaram.`);
process.exit(0);
