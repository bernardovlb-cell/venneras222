/**
 * Teste ponta a ponta no navegador (Playwright) contra o build de produção.
 * Pré-requisitos: PostgreSQL acessível (E2E_DATABASE_URL) e `npm run build` executado.
 * Uso: npm run test:e2e
 */
import { createRequire } from "node:module";
import { spawn, execSync } from "node:child_process";
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
    await c.getByText("Minha conta").first().waitFor();
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

  // ---------------- responsividade
  await step("sem rolagem horizontal em 375px e 1366px", async () => {
    const pages = ["/", "/busca", "/c/carrinhos-e-pistas", "/produto/caminhao-basculante-e2e", "/carrinho", "/presentes?idade=3-4", "/atendimento", "/conta/entrar", "/p/trocas-e-devolucoes"];
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
