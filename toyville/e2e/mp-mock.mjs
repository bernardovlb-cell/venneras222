/**
 * SERVIDOR SIMULADO DA API DO MERCADO PAGO — usado SOMENTE nos testes automatizados (MP_API_BASE_URL).
 * Implementa o mínimo: criar preferência, consultar/buscar pagamento e reembolso.
 * Não substitui a homologação no ambiente de testes oficial do Mercado Pago.
 */
import http from "node:http";

export function startMpMock(port) {
  const prefs = new Map();
  const payments = new Map();
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://localhost:${port}`);
    let body = "";
    for await (const c of req) body += c;
    const json = (d, s = 200) => { res.writeHead(s, { "content-type": "application/json" }); res.end(JSON.stringify(d)); };
    if (req.headers.authorization !== "Bearer TEST-e2e-token" && !url.pathname.startsWith("/checkout")) return json({ message: "unauthorized" }, 401);
    if (url.pathname === "/checkout/preferences" && req.method === "POST") {
      const p = JSON.parse(body);
      const id = `pref-${prefs.size + 1}`;
      prefs.set(id, p);
      return json({ id, init_point: `http://localhost:${port}/checkout?pref_id=${id}` }, 201);
    }
    if (url.pathname === "/checkout") { res.writeHead(200, { "content-type": "text/html" }); return res.end("<h1>Checkout simulado do Mercado Pago (teste)</h1>"); }
    const m = url.pathname.match(/^\/v1\/payments\/(\d+)$/);
    if (m) return payments.has(m[1]) ? json(payments.get(m[1])) : json({ message: "not found" }, 404);
    if (url.pathname === "/v1/payments/search") return json({ results: [...payments.values()].filter((p) => p.external_reference === url.searchParams.get("external_reference")) });
    return json({ message: "unexpected" }, 500);
  });
  server.listen(port);
  return {
    prefs, payments, close: () => server.close(),
    pay(prefId, status = "approved") {
      const p = prefs.get(prefId);
      const total = p.items.reduce((s, i) => s + i.unit_price * i.quantity, 0) + (p.shipments?.cost ?? 0);
      const id = String(90000 + payments.size);
      payments.set(id, { id: Number(id), status, status_detail: status === "approved" ? "accredited" : "pending_waiting_payment", external_reference: p.external_reference, transaction_amount: Math.round(total * 100) / 100, currency_id: "BRL", payment_type_id: "bank_transfer", payment_method_id: "pix", date_approved: new Date().toISOString() });
      return id;
    },
  };
}
