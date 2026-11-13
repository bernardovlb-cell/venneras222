import { searchSuggestions } from "@/server/services/catalog";
import { rateLimit } from "@/server/rate-limit";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").slice(0, 80);
  const ip = (req.headers.get("x-forwarded-for")?.split(",")[0] ?? "local").trim();
  const rl = await rateLimit(`suggest:${ip}`, 90, 60);
  if (!rl.allowed) return Response.json({ products: [], categories: [], brands: [] }, { status: 429 });
  const data = await searchSuggestions(q);
  return Response.json(data, { headers: { "Cache-Control": "private, max-age=30" } });
}
