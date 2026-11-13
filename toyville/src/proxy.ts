import { NextResponse, type NextRequest } from "next/server";

/**
 * Primeira barreira (barata, sem banco): sem cookie de sessão, áreas privadas redirecionam ao login.
 * A verificação real (sessão válida, papel e permissão) acontece no servidor em cada página/ação.
 */
const SESSION = process.env.NODE_ENV === "production" ? "__Host-tv_session" : "tv_session";

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const has = req.cookies.has(SESSION);
  if (pathname.startsWith("/admin") && pathname !== "/admin/entrar" && !has) {
    return NextResponse.redirect(new URL("/admin/entrar", req.url));
  }
  const publicAccount = ["/conta/entrar", "/conta/cadastro", "/conta/recuperar", "/conta/redefinir"];
  if (pathname.startsWith("/conta") && !publicAccount.some((p) => pathname.startsWith(p)) && !has) {
    const url = new URL("/conta/entrar", req.url);
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  const res = NextResponse.next();
  if (pathname.startsWith("/admin") || pathname.startsWith("/conta")) res.headers.set("Cache-Control", "no-store");
  return res;
}

export const config = { matcher: ["/admin/:path*", "/conta/:path*"] };
