import { getCurrentUser } from "@/server/auth/session";
import { hasPermission } from "@/server/auth/permissions";
import { templateCsv } from "@/lib/product-import";

export const dynamic = "force-dynamic";

export async function GET() {
  const u = await getCurrentUser();
  if (!u?.isStaff || !hasPermission(u.permissions, "products.read")) return new Response("Acesso negado", { status: 403 });
  // BOM para o Excel abrir acentos corretamente
  return new Response("﻿" + templateCsv(), {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="modelo-produtos-toyville.csv"' },
  });
}
