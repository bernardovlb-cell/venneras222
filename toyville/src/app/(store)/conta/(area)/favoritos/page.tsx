import type { Metadata } from "next";
import { requireUserPage } from "@/server/auth/guards";
import { myFavorites } from "@/server/services/customer";
import { ProductGrid } from "@/components/product/ProductCard";
import { EmptyState } from "@/components/ui/States";

export const metadata: Metadata = { title: "Favoritos", robots: { index: false } };

export default async function Favorites() {
  const u = await requireUserPage("/conta/favoritos");
  const items = await myFavorites(u.id);
  return (
    <div>
      <h1 className="mb-4 text-3xl font-extrabold text-primary-dark">Favoritos</h1>
      {items.length ? <ProductGrid items={items} favorites={new Set(items.map((i) => i.id))} /> : <EmptyState title="Nenhum favorito ainda" text="Toque no coração dos produtos para salvá-los aqui." action={{ href: "/", label: "Explorar" }} emoji="💛" />}
    </div>
  );
}
