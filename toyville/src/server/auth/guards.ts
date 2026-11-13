import "server-only";
import { redirect, notFound } from "next/navigation";
import { getCurrentUser, type CurrentUser } from "./session";
import { hasPermission, type Permission } from "./permissions";
import { AppError } from "../errors";

/** Para páginas: redireciona ao login se não autenticado. */
export async function requireUserPage(next = "/conta"): Promise<CurrentUser> {
  const u = await getCurrentUser();
  if (!u) redirect(`/conta/entrar?next=${encodeURIComponent(next)}`);
  return u;
}

/** Para páginas do painel: sem sessão → login; sem permissão → 404 (não revela a área). */
export async function requireStaffPage(permission?: Permission): Promise<CurrentUser> {
  const u = await getCurrentUser();
  if (!u) redirect("/admin/entrar");
  if (!u.isStaff) notFound();
  if (permission && !hasPermission(u.permissions, permission)) redirect("/admin?sem-permissao=1");
  return u;
}

/** Para ações e rotas: lança erro (nunca confie apenas no esconder de botões). */
export async function requireUser(): Promise<CurrentUser> {
  const u = await getCurrentUser();
  if (!u) throw new AppError("unauthenticated", "Faça login para continuar.", 401);
  return u;
}

export async function requirePermission(permission: Permission): Promise<CurrentUser> {
  const u = await getCurrentUser();
  if (!u || !u.isStaff) throw new AppError("forbidden", "Acesso negado.", 403);
  if (!hasPermission(u.permissions, permission)) throw new AppError("forbidden", "Você não tem permissão para esta ação.", 403);
  return u;
}

export function can(u: CurrentUser | null, p: Permission): boolean {
  return !!u && u.isStaff && hasPermission(u.permissions, p);
}
