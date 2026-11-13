import { eq } from "drizzle-orm";
import { requireStaffPage } from "@/server/auth/guards";
import { listStaff } from "@/server/services/admin";
import { db } from "@/server/db/client";
import { roles } from "@/server/db/schema";
import { PERMISSIONS } from "@/server/auth/permissions";
import { PageHead, Panel, Badge } from "@/components/admin/server-ui";
import { AdminForm, F, Check } from "@/components/admin/ui";
import { createStaffAction, updateStaffAction, updateRoleAction } from "@/app/admin/actions";

export default async function UsersPage() {
  const me = await requireStaffPage("users.manage");
  const [staff, rs] = await Promise.all([listStaff(), db.select().from(roles).where(eq(roles.isStaff, true))]);
  const roleOpts = rs.filter((r) => r.key !== "owner" || me.roleKey === "owner");
  return (
    <div className="max-w-5xl space-y-6">
      <PageHead title="Usuários e permissões" subtitle="Acesso da equipe ao painel. Cada ação administrativa é registrada na auditoria." />
      <Panel title="Equipe">
        <ul className="divide-y divide-line">
          {staff.map((s) => (
            <li key={s.id} className="py-3">
              <p className="text-sm"><strong>{s.name}</strong> · {s.email} {!s.isActive && <Badge tone="red">inativo</Badge>} <span className="text-xs text-muted">último acesso: {s.lastLoginAt?.toLocaleString("pt-BR") ?? "nunca"}</span></p>
              {s.id !== me.id ? (
                <AdminForm action={updateStaffAction} submitLabel="Salvar" className="mt-2 !space-y-2">
                  <input type="hidden" name="userId" value={s.id} />
                  <div className="flex flex-wrap items-end gap-3">
                    <F label="Papel" name="roleKey" as="select" defaultValue={s.roleKey}>{roleOpts.map((r) => <option key={r.key} value={r.key}>{r.name}</option>)}</F>
                    <Check label="Ativo" name="isActive" defaultChecked={s.isActive} />
                  </div>
                </AdminForm>
              ) : <p className="text-xs text-muted">(você)</p>}
            </li>
          ))}
        </ul>
      </Panel>
      <Panel title="Adicionar membro da equipe">
        <AdminForm action={createStaffAction} submitLabel="Criar acesso" resetOnSuccess>
          <div className="grid gap-3 sm:grid-cols-2">
            <F label="Nome" name="name" required /><F label="E-mail" name="email" type="email" required />
            <F label="Senha inicial" name="password" type="password" autoComplete="new-password" required hint="Mín. 8 caracteres com letras e números" />
            <F label="Papel" name="roleKey" as="select" defaultValue="staff">{roleOpts.map((r) => <option key={r.key} value={r.key}>{r.name}</option>)}</F>
          </div>
        </AdminForm>
      </Panel>
      <Panel title="Permissões por papel">
        <div className="space-y-5">
          {rs.map((r) => (
            <div key={r.key} className="rounded-xl border border-line p-3">
              <p className="font-extrabold">{r.name}</p>
              {r.key === "owner" ? <p className="text-sm text-muted">Acesso total (não editável).</p> : (
                <AdminForm action={updateRoleAction} submitLabel="Salvar permissões" className="mt-2">
                  <input type="hidden" name="key" value={r.key} />
                  <div className="grid gap-x-4 sm:grid-cols-2">{Object.entries(PERMISSIONS).map(([k, label]) => <Check key={k} label={label} name="permissions" value={k} defaultChecked={r.permissions.includes(k) || r.permissions.includes("*")} />)}</div>
                </AdminForm>
              )}
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
