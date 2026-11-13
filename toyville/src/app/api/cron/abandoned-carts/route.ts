import { timingSafeEqual } from "node:crypto";
import { env } from "@/server/env";
import { sendCartRecoveryEmails } from "@/server/services/cart-recovery";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Lembretes de carrinho abandonado. Agende a cada hora com Authorization: Bearer <CRON_SECRET>. */
export async function GET(req: Request) {
  const secret = env.cronSecret;
  const got = Buffer.from(req.headers.get("authorization") ?? "");
  const want = Buffer.from(`Bearer ${secret}`);
  if (!secret || got.length !== want.length || !timingSafeEqual(got, want)) return Response.json({ ok: false }, { status: 401 });
  return Response.json({ ok: true, ...(await sendCartRecoveryEmails()) });
}
