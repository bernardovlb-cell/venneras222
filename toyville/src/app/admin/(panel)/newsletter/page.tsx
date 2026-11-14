import { requireStaffPage } from "@/server/auth/guards";
import { hasPermission } from "@/server/auth/permissions";
import { listNewsletterSubscribers, newsletterCounts } from "@/server/services/newsletter";
import { getSettings } from "@/server/settings";
import { audit } from "@/server/audit";
import { PageHead, Panel, Badge } from "@/components/admin/server-ui";
import { NewsletterRow, CopyEmails } from "@/components/admin/NewsletterAdmin";

const fmt = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" });

export default async function NewsletterPage() {
  const u = await requireStaffPage("customers.read");
  const [subs, counts, s] = await Promise.all([listNewsletterSubscribers(), newsletterCounts(), getSettings()]);
  await audit({ userId: u.id, action: "newsletter.view", entity: "newsletter_subscriber", data: { count: subs.length } });
  const active = subs.filter((x) => !x.unsubscribedAt);
  const canRemove = hasPermission(u.permissions, "support.handle");
  return (
    <div className="max-w-4xl space-y-6">
      <PageHead title="Newsletter" subtitle="E-mails cadastrados no rodapé da loja, com consentimento registrado. O site não envia e-mails: use a lista na ferramenta de envio da sua escolha." />
      <Panel title={`Inscritos ativos: ${counts.active}`}>
        {!s.home.newsletterEnabled && <p className="mb-3 rounded-xl bg-soft-yellow px-3 py-2 text-sm font-bold">O cadastro está desativado no rodapé (Conteúdo e home → Carrossel principal).</p>}
        {active.length === 0 ? <p className="text-sm text-muted">Nenhum e-mail cadastrado ainda.</p> : <CopyEmails emails={active.map((x) => x.email)} />}
      </Panel>
      {subs.length > 0 && (
        <Panel title="Cadastros">
          <ul className="divide-y divide-line text-sm">
            {subs.map((x) => (
              <li key={x.id} className="flex flex-wrap items-center gap-2 py-2.5">
                <span className="font-bold">{x.email}</span>
                {x.unsubscribedAt ? <Badge tone="gray">cancelado</Badge> : <Badge tone="green">ativo</Badge>}
                <span className="text-muted">consentiu em {fmt.format(x.consentAt)}</span>
                {canRemove && <span className="ml-auto"><NewsletterRow id={x.id} email={x.email} /></span>}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-muted">Remover apaga o registro definitivamente (use quando a pessoa pedir para sair da lista).</p>
        </Panel>
      )}
    </div>
  );
}
