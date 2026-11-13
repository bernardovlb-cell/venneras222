import "server-only";
import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "../db/client";
import { favorites, orderItems, orders, supportTickets, users } from "../db/schema";
import { listProducts } from "./catalog";

export async function myOrders(userId: string) {
  return db.select({
    id: orders.id, number: orders.number, createdAt: orders.createdAt, status: orders.status, paymentStatus: orders.paymentStatus,
    fulfillmentStatus: orders.fulfillmentStatus, totalCents: orders.totalCents,
  }).from(orders).where(eq(orders.userId, userId)).orderBy(desc(orders.createdAt)).limit(100);
}

export async function myFavorites(userId: string) {
  const ids = (await db.select({ id: favorites.productId }).from(favorites).where(eq(favorites.userId, userId)).orderBy(desc(favorites.createdAt))).map((r) => r.id);
  if (!ids.length) return [];
  const { items } = await listProducts({ productIds: ids, perPage: 60 });
  return items;
}

export async function myTickets(userId: string) {
  return db.select().from(supportTickets).where(eq(supportTickets.userId, userId)).orderBy(desc(supportTickets.createdAt)).limit(50);
}

export async function myProfile(userId: string) {
  return (await db.select({ name: users.name, email: users.email, phone: users.phone, marketingConsent: users.marketingConsent }).from(users).where(eq(users.id, userId)))[0];
}

export async function purchasedProducts(userId: string) {
  const r = await db.selectDistinct({ productId: orderItems.productId }).from(orderItems).innerJoin(orders, eq(orders.id, orderItems.orderId))
    .where(and(eq(orders.userId, userId), inArray(orders.status, ["paid", "completed"])));
  return r.map((x) => x.productId).filter(Boolean) as string[];
}
