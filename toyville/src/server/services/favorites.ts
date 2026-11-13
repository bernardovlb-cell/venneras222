import "server-only";
import { eq } from "drizzle-orm";
import { db } from "../db/client";
import { favorites } from "../db/schema";
import { getCurrentUser } from "../auth/session";

export async function myFavoriteIds(): Promise<Set<string>> {
  const u = await getCurrentUser();
  if (!u) return new Set();
  const rows = await db.select({ id: favorites.productId }).from(favorites).where(eq(favorites.userId, u.id));
  return new Set(rows.map((r) => r.id));
}
