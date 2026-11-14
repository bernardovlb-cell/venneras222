import { sql } from "drizzle-orm";
import { requireStaffPage } from "@/server/auth/guards";
import { hasPermission, type Permission } from "@/server/auth/permissions";
import { AdminNav, type NavItem } from "@/components/admin/AdminNav";
import { db } from "@/server/db/client";

const NAV: (NavItem & { perm: Permission })[] = [
  { href: "/admin", label: "Painel", perm: "dashboard.view" },
  { href: "/admin/pedidos", label: "Pedidos", perm: "orders.read" },
  { href: "/admin/produtos", label: "Produtos", perm: "products.read" },
  { href: "/admin/categorias", label: "Categorias e marcas", perm: "products.read" },
  { href: "/admin/clientes", label: "Clientes", perm: "customers.read" },
  { href: "/admin/newsletter", label: "Newsletter", perm: "customers.read" },
  { href: "/admin/promocoes", label: "Promoções e cupons", perm: "promotions.write" },
  { href: "/admin/conteudo", label: "Conteúdo e home", perm: "content.write" },
  { href: "/admin/avaliacoes", label: "Avaliações", perm: "reviews.moderate" },
  { href: "/admin/atendimento", label: "Atendimento", perm: "support.handle" },
  { href: "/admin/configuracoes", label: "Configurações", perm: "settings.write" },
  { href: "/admin/integracoes", label: "Integrações", perm: "integrations.manage" },
  { href: "/admin/usuarios", label: "Usuários e permissões", perm: "users.manage" },
  { href: "/admin/auditoria", label: "Auditoria", perm: "audit.read" },
];

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const u = await requireStaffPage();
  const { rows: [counts] } = await db.execute<{ attention: number; reviews: number; tickets: number; toship: number }>(sql`
    select (select count(*)::int from orders where attention_reason is not null) as attention,
           (select count(*)::int from reviews where status = 'pending') as reviews,
           (select count(*)::int from support_tickets where status in ('open','in_progress')) as tickets,
           (select count(*)::int from orders where status = 'paid' and fulfillment_status in ('unfulfilled','picking')) as toship`);
  const badges: Record<string, number> = { "/admin/pedidos": counts.toship + counts.attention, "/admin/avaliacoes": counts.reviews, "/admin/atendimento": counts.tickets };
  const items = NAV.filter((n) => hasPermission(u.permissions, n.perm)).map(({ perm: _p, ...n }) => ({ ...n, badge: badges[n.href] }));
  return (
    <div className="lg:flex">
      <AdminNav items={items} userName={u.name} roleName={u.roleName} />
      <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
    </div>
  );
}
