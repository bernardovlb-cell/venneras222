import { timingSafeEqual } from "node:crypto";
import { env } from "@/server/env";
import { expireStaleOrders } from "@/server/services/orders";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Expira pedidos não pagos cuja reserva venceu (consultando o Mercado Pago antes de cancelar).
 * Agende a cada 15–60 min (Vercel Cron, cron do servidor ou serviço externo) com:
 *   Authorization: Bearer <CRON_SECRET>
 */
function authorized(req: Request) {
  const secret = env.cronSecret;
  if (!secret) return false;
  const got = Buffer.from(req.headers.get("authorization") ?? "");
  const want = Buffer.from(`Bearer ${secret}`);
  return got.length === want.length && timingSafeEqual(got, want);
}

export async function GET(req: Request) {
  if (!authorized(req)) return Response.json({ ok: false }, { status: 401 });
  const result = await expireStaleOrders();
  return Response.json({ ok: true, ...result });
}
