import type { Metadata } from "next";
import { eq, desc } from "drizzle-orm";
import { requireUserPage } from "@/server/auth/guards";
import { db } from "@/server/db/client";
import { addresses } from "@/server/db/schema";
import { AddressManager } from "@/components/account/AddressManager";

export const metadata: Metadata = { title: "Endereços", robots: { index: false } };

export default async function Addresses() {
  const u = await requireUserPage("/conta/enderecos");
  const list = await db.select().from(addresses).where(eq(addresses.userId, u.id)).orderBy(desc(addresses.isDefault), desc(addresses.createdAt));
  return (
    <div>
      <h1 className="mb-4 text-3xl font-extrabold text-primary-dark">Endereços</h1>
      <AddressManager list={list} />
    </div>
  );
}
