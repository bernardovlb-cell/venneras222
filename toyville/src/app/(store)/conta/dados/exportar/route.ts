import { getCurrentUser } from "@/server/auth/session";
import { exportAccountData } from "@/server/services/account";
import { rateLimit } from "@/server/rate-limit";

export const dynamic = "force-dynamic";

export async function GET() {
  const u = await getCurrentUser();
  if (!u) return new Response("Não autenticado", { status: 401 });
  const rl = await rateLimit(`export:${u.id}`, 5, 3600);
  if (!rl.allowed) return new Response("Muitas solicitações. Tente mais tarde.", { status: 429 });
  const data = await exportAccountData(u.id);
  return new Response(JSON.stringify(data, null, 2), {
    headers: { "Content-Type": "application/json; charset=utf-8", "Content-Disposition": 'attachment; filename="meus-dados-toyville.json"', "Cache-Control": "no-store" },
  });
}
