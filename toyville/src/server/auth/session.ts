import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { and, eq, gt, lt } from "drizzle-orm";
import { db } from "../db/client";
import { roles, sessions, users } from "../db/schema";
import { randomToken, sha256 } from "./password";
import { env } from "../env";

export const SESSION_COOKIE = process.env.NODE_ENV === "production" ? "__Host-tv_session" : "tv_session";
const CUSTOMER_TTL_MS = 30 * 24 * 3600 * 1000;
const STAFF_TTL_MS = 12 * 3600 * 1000;

export interface CurrentUser {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  roleKey: string;
  roleName: string;
  isStaff: boolean;
  permissions: string[];
}

export async function createSession(userId: string, isStaff: boolean, meta: { ip?: string; userAgent?: string } = {}) {
  const token = randomToken(32);
  const expiresAt = new Date(Date.now() + (isStaff ? STAFF_TTL_MS : CUSTOMER_TTL_MS));
  await db.insert(sessions).values({ id: sha256(token), userId, expiresAt, ip: meta.ip, userAgent: meta.userAgent });
  // limpeza oportunista de sessões expiradas
  await db.delete(sessions).where(and(eq(sessions.userId, userId), lt(sessions.expiresAt, new Date())));
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: env.isProd,
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await db.delete(sessions).where(eq(sessions.id, sha256(token)));
  jar.delete(SESSION_COOKIE);
}

export async function destroyAllSessions(userId: string) {
  await db.delete(sessions).where(eq(sessions.userId, userId));
}

export async function userFromToken(token: string | undefined | null): Promise<CurrentUser | null> {
  if (!token || token.length > 200) return null;
  const rows = await db
    .select({
      id: users.id, email: users.email, name: users.name, phone: users.phone, roleKey: users.roleKey,
      roleName: roles.name, isStaff: roles.isStaff, permissions: roles.permissions, isActive: users.isActive,
    })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .innerJoin(roles, eq(roles.key, users.roleKey))
    .where(and(eq(sessions.id, sha256(token)), gt(sessions.expiresAt, new Date())))
    .limit(1);
  const u = rows[0];
  if (!u || !u.isActive) return null;
  const { isActive: _ignored, ...rest } = u;
  void _ignored;
  return rest;
}

/** Usuário autenticado da requisição atual (memoizado por requisição). */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const jar = await cookies();
  return userFromToken(jar.get(SESSION_COOKIE)?.value);
});
