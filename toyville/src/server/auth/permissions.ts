export const PERMISSIONS = {
  "dashboard.view": "Ver painel e indicadores",
  "products.read": "Ver produtos e estoque",
  "products.write": "Cadastrar/editar produtos, categorias, marcas e estoque",
  "orders.read": "Ver pedidos",
  "orders.write": "Atualizar separação, entrega, rastreamento e cancelar pedidos não pagos",
  "orders.refund": "Solicitar reembolsos ao Mercado Pago",
  "customers.read": "Ver clientes e histórico",
  "promotions.write": "Gerenciar cupons e promoções",
  "content.write": "Gerenciar banners, home e páginas institucionais",
  "reviews.moderate": "Moderar avaliações",
  "support.handle": "Responder atendimentos, trocas e devoluções",
  "settings.write": "Alterar configurações da loja",
  "users.manage": "Gerenciar usuários da equipe e permissões",
  "integrations.manage": "Gerenciar integrações (marketplaces, fiscal, frete)",
  "audit.read": "Ver logs de auditoria",
} as const;

export type Permission = keyof typeof PERMISSIONS;

export const DEFAULT_ROLES: { key: string; name: string; isStaff: boolean; permissions: string[] }[] = [
  { key: "owner", name: "Proprietário", isStaff: true, permissions: ["*"] },
  {
    key: "admin", name: "Administrador", isStaff: true,
    permissions: Object.keys(PERMISSIONS).filter((p) => p !== "users.manage"),
  },
  {
    key: "staff", name: "Equipe (atendimento e expedição)", isStaff: true,
    permissions: ["dashboard.view", "products.read", "orders.read", "orders.write", "customers.read", "support.handle", "reviews.moderate"],
  },
  { key: "customer", name: "Cliente", isStaff: false, permissions: [] },
];

export function hasPermission(perms: readonly string[], p: Permission): boolean {
  return perms.includes("*") || perms.includes(p);
}
