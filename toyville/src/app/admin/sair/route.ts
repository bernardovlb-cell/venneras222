import { NextResponse } from "next/server";
import { destroySession } from "@/server/auth/session";

export const dynamic = "force-dynamic";

/** Logout só por POST (um link GET permitiria que outro site deslogasse a equipe). Com SameSite=Lax o cookie não acompanha POST vindo de outro site. */
async function handler(req: Request) {
  await destroySession();
  return NextResponse.redirect(new URL("/admin/entrar", req.url), 303);
}
export { handler as POST };
