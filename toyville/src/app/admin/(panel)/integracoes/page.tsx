import { requireStaffPage } from "@/server/auth/guards";
import { integrationOverview } from "@/server/services/admin";
import { PageHead, Panel, Badge, Table } from "@/components/admin/server-ui";
import { AdminForm, F, ActionButton } from "@/components/admin/ui";
import { saveListingAction, deleteRecordAction } from "@/app/admin/actions";
import { CHANNELS } from "@/server/integrations/marketplaces";

export default async function IntegrationsPage() {
  await requireStaffPage("integrations.manage");
  const d = await integrationOverview();
  return (
    <div className="max-w-6xl space-y-6">
      <PageHead title="Integrações" subtitle="Status real de cada integração. Nada aqui é simulado." />
      <Panel title="Marketplaces">
        <div className="grid gap-3 sm:grid-cols-3">
          {CHANNELS.map((c) => (
            <div key={c.key} className="rounded-xl border border-line p-3 text-sm">
              <p className="font-extrabold">{c.name} <Badge tone="gray">não conectado</Badge></p>
              <p className="mt-1 text-xs text-muted">{c.requirements}</p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-muted">A sincronização automática de estoque/pedidos fica desativada até haver credenciais e aplicação aprovada em cada plataforma. Os vínculos abaixo já preparam o mapeamento de SKUs.</p>
      </Panel>
      <Panel title="Vínculo de SKUs com anúncios externos">
        <AdminForm action={saveListingAction} submitLabel="Vincular" resetOnSuccess>
          <div className="grid gap-2 sm:grid-cols-4">
            <F label="Canal" name="channel" as="select">{CHANNELS.map((c) => <option key={c.key} value={c.key}>{c.name}</option>)}</F>
            <F label="SKU interno (variação)" name="sku" required />
            <F label="ID do anúncio externo" name="externalId" required placeholder="MLB123… / ASIN / item_id" />
            <F label="SKU no canal (opcional)" name="externalSku" />
          </div>
        </AdminForm>
        <div className="mt-4"><Table head={["Canal", "Anúncio", "SKU", "Status", "Última sinc.", ""]} empty="Nenhum vínculo.">
          {d.listings.map((l) => <tr key={l.id}><td className="px-3 py-2">{l.channel}</td><td className="px-3 py-2 font-mono text-xs">{l.externalId}</td><td className="px-3 py-2">{l.sku}</td><td className="px-3 py-2">{l.status}{l.lastError && <p className="text-xs text-promo">{l.lastError}</p>}</td><td className="px-3 py-2 text-xs">{l.lastSyncedAt?.toLocaleString("pt-BR") ?? "nunca"}</td>
            <td className="px-3 py-2"><ActionButton action={deleteRecordAction.bind(null, "listing", l.id)} confirm="Remover vínculo?" className="btn btn-ghost btn-sm text-promo">Remover</ActionButton></td></tr>)}
        </Table></div>
      </Panel>
      <Panel title="Webhooks recebidos (Mercado Pago)">
        <Table head={["Recebido", "Tópico", "Recurso", "Assinatura", "Processado", "Erro"]} empty="Nenhuma notificação recebida ainda.">
          {d.hooks.map((h) => <tr key={h.id}><td className="px-3 py-2 text-xs">{h.receivedAt.toLocaleString("pt-BR")}</td><td className="px-3 py-2">{h.topic}</td><td className="px-3 py-2 font-mono text-xs">{h.resourceId}</td><td className="px-3 py-2">{h.signatureValid ? <Badge tone="green">válida</Badge> : <Badge tone="red">inválida</Badge>}</td><td className="px-3 py-2 text-xs">{h.processedAt?.toLocaleString("pt-BR") ?? "—"}</td><td className="px-3 py-2 text-xs text-promo">{h.error}</td></tr>)}
        </Table>
      </Panel>
      <Panel title="E-mails (caixa de saída)">
        <Table head={["Quando", "Para", "Assunto", "Status"]} empty="Nenhum e-mail.">
          {d.outbox.map((e) => <tr key={e.id}><td className="px-3 py-2 text-xs">{e.createdAt.toLocaleString("pt-BR")}</td><td className="px-3 py-2 text-xs">{e.to}</td><td className="px-3 py-2">{e.subject}</td><td className="px-3 py-2"><Badge tone={e.status === "sent" ? "green" : e.status === "failed" ? "red" : "yellow"}>{e.status === "not_configured" ? "não enviado (sem provedor)" : e.status}</Badge></td></tr>)}
        </Table>
      </Panel>
    </div>
  );
}
