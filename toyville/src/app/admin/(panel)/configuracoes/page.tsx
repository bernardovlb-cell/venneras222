import Image from "next/image";
import { requireStaffPage } from "@/server/auth/guards";
import { getSettings } from "@/server/settings";
import { listShippingMethods } from "@/server/shipping";
import { env, mercadoPagoMode } from "@/server/env";
import { PageHead, Panel, Badge } from "@/components/admin/server-ui";
import { SettingsForm, BenefitsForm, ShippingMethodForm } from "@/components/admin/SettingsForms";

function In({ label, name, value, hint, type = "text", ...rest }: { label: string; name: string; value: string | number; hint?: string; type?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block text-sm"><span className="label !text-[13px]">{label}</span>
      <input name={name} type={type} defaultValue={String(value)} className={type === "color" ? "h-10 w-20 rounded-lg border border-line" : "field !min-h-[38px] !text-sm"} {...rest} />
      {hint && <span className="hint block">{hint}</span>}
    </label>
  );
}
function Ck({ label, name, checked, disabled }: { label: string; name: string; checked: boolean; disabled?: boolean }) {
  return <label className="flex items-center gap-2 text-sm"><input type="checkbox" name={name} defaultChecked={checked} disabled={disabled} className="size-4" />{label}</label>;
}

export default async function SettingsPage() {
  await requireStaffPage("settings.write");
  const [s, methods] = await Promise.all([getSettings(), listShippingMethods()]);
  const mode = mercadoPagoMode();
  return (
    <div className="max-w-5xl space-y-6">
      <PageHead title="Configurações" />

      <Panel title="Pagamentos — Mercado Pago (Checkout Pro)">
        <ul className="space-y-1 text-sm">
          <li>Credenciais: {mode === "not_configured" ? <Badge tone="red">não configuradas</Badge> : mode === "test" ? <Badge tone="yellow">TESTE</Badge> : mode === "unknown" ? <Badge tone="red">ambiente não declarado (MP_ENVIRONMENT)</Badge> : <Badge tone="green">produção</Badge>}</li>
          <li>Chave secreta do webhook: {env.mpWebhookSecret ? <Badge tone="green">configurada</Badge> : <Badge tone="red">ausente</Badge>}</li>
          <li>URL de notificação a cadastrar no Mercado Pago: <code className="rounded bg-cream px-1">{env.appUrl}/api/webhooks/mercadopago</code> (evento: Pagamentos)</li>
        </ul>
        <p className="mt-2 text-xs text-muted">Credenciais ficam somente em variáveis de ambiente do servidor (nunca no painel nem no navegador). Veja docs/MERCADO_PAGO.md.</p>
      </Panel>

      <Panel title="Dados da loja">
        <SettingsForm settingsKey="store">
          <div className="grid gap-3 sm:grid-cols-2">
            <In label="Nome" name="name" value={s.store.name} />
            <In label="Slogan" name="tagline" value={s.store.tagline} />
            <In label="Razão social" name="legalName" value={s.store.legalName} />
            <In label="CNPJ" name="cnpj" value={s.store.cnpj} />
            <In label="E-mail de atendimento" name="email" value={s.store.email} type="email" />
            <In label="Telefone" name="phone" value={s.store.phone} />
            <In label="Endereço (rodapé)" name="address" value={s.store.address} />
            <In label="Horário de atendimento" name="businessHours" value={s.store.businessHours} />
          </div>
        </SettingsForm>
      </Panel>

      <Panel title="Marca: logo e cores">
        <div className="mb-3 flex items-center gap-4">
          <span className="rounded-xl border border-line bg-white p-2"><Image src={s.brand.logoUrl} alt="Logo atual" width={s.brand.logoWidth} height={s.brand.logoHeight} className="h-auto w-40" /></span>
          <p className="text-xs text-muted">A logo é exibida sempre na proporção original (sem corte ou distorção). Envie um arquivo novo para substituir.</p>
        </div>
        <SettingsForm settingsKey="brand">
          <label className="block text-sm"><span className="label !text-[13px]">Nova logo (PNG/WebP/JPG)</span><input type="file" name="logo" accept="image/png,image/webp,image/jpeg" className="field !text-sm" /></label>
          <input type="hidden" name="logoUrl" value={s.brand.logoUrl} /><input type="hidden" name="logoWidth" data-num value={s.brand.logoWidth} /><input type="hidden" name="logoHeight" data-num value={s.brand.logoHeight} />
          <div className="flex flex-wrap gap-4">
            <In label="Principal (azul)" name="primary" value={s.brand.primary} type="color" />
            <In label="Principal escuro" name="primaryDark" value={s.brand.primaryDark} type="color" />
            <In label="Destaque (amarelo)" name="accent" value={s.brand.accent} type="color" />
            <In label="Promoções (vermelho)" name="promo" value={s.brand.promo} type="color" />
            <In label="Detalhes (verde)" name="success" value={s.brand.success} type="color" />
            <In label="Fundo (creme)" name="background" value={s.brand.background} type="color" />
          </div>
          <p className="hint">Verifique o contraste: texto branco precisa ser legível sobre a cor principal e a de promoções.</p>
        </SettingsForm>
      </Panel>

      <Panel title="WhatsApp">
        <SettingsForm settingsKey="whatsapp">
          <div className="grid gap-3 sm:grid-cols-2">
            <In label="Número (DDI+DDD+número, só dígitos)" name="number" value={s.whatsapp.number} placeholder="5511999999999" />
            <In label="Mensagem inicial" name="defaultMessage" value={s.whatsapp.defaultMessage} />
          </div>
          <Ck label="Exibir botão flutuante e links de WhatsApp" name="enabled" checked={s.whatsapp.enabled} />
        </SettingsForm>
      </Panel>

      <Panel title="Diferenciais da loja (home)"><BenefitsForm initial={s.benefits.items} /></Panel>

      <Panel title="Checkout">
        <SettingsForm settingsKey="checkout">
          <div className="grid gap-3 sm:grid-cols-3">
            <In label="Reserva de estoque/prazo de pagamento (horas)" name="reservationHours" value={s.checkout.reservationHours} type="number" data-num min={1} max={168} hint="Também é o vencimento de Pix/boleto" />
            <In label="Máximo de parcelas" name="maxInstallments" value={s.checkout.maxInstallments} type="number" data-num min={1} max={12} hint="Juros conforme sua conta Mercado Pago" />
            <In label="Versão dos termos" name="termsVersion" value={s.checkout.termsVersion} />
          </div>
          <Ck label="Exigir CPF no checkout" name="requireCpf" checked={s.checkout.requireCpf} />
          <div className="grid gap-3 rounded-xl bg-cream p-3 sm:grid-cols-2">
            <Ck label="Enviar lembrete de carrinho abandonado (somente para quem consentiu no checkout)" name="cartRecoveryEnabled" checked={s.checkout.cartRecoveryEnabled} />
            <In label="Enviar após (horas sem atividade)" name="cartRecoveryHours" value={s.checkout.cartRecoveryHours} type="number" data-num min={1} max={168} hint="Um único lembrete por carrinho; requer provedor de e-mail" />
          </div>
        </SettingsForm>
      </Panel>

      <Panel title="Entrega e retirada">
        <div className="space-y-5">{methods.map((m) => (
          <div key={m.id} className="rounded-xl border border-line p-3">
            <p className="mb-2 font-extrabold">{m.name} <span className="text-xs font-normal text-muted">({m.type})</span> {m.isActive ? <Badge tone="green">ativa</Badge> : <Badge>inativa</Badge>}</p>
            <ShippingMethodForm m={{ id: m.id, type: m.type, name: m.name, isActive: m.isActive, config: m.config }} />
          </div>
        ))}</div>
        <p className="mt-3 text-xs text-muted">Frete grátis por valor mínimo é configurado em Promoções (tipo “Frete grátis”).</p>
      </Panel>

      <Panel title="Fiscal (NF-e)">
        <SettingsForm settingsKey="fiscal">
          <In label="Emissor de notas utilizado" name="provider" value={s.fiscal.provider} placeholder="Informe o nome do sistema emissor" />
          <In label="Observações" name="notes" value={s.fiscal.notes} />
          <Ck label="Emissão automática (bloqueada até haver integração validada)" name="autoIssue" checked={false} disabled />
        </SettingsForm>
      </Panel>

      <Panel title="Marketing e análise">
        <SettingsForm settingsKey="analytics">
          <div className="grid gap-3 sm:grid-cols-3">
            <In label="Google Analytics 4" name="ga4Id" value={s.analytics.ga4Id} placeholder="G-XXXXXXX" />
            <In label="Google Tag Manager" name="gtmId" value={s.analytics.gtmId} placeholder="GTM-XXXXXX" />
            <In label="Meta Pixel" name="metaPixelId" value={s.analytics.metaPixelId} placeholder="1234567890" />
          </div>
          <p className="hint">Scripts só carregam após o consentimento do visitante no banner de cookies.</p>
        </SettingsForm>
      </Panel>

      <Panel title="Redes sociais e SEO">
        <SettingsForm settingsKey="social">
          <div className="grid gap-3 sm:grid-cols-2">
            <In label="Instagram (URL)" name="instagram" value={s.social.instagram} /><In label="Facebook (URL)" name="facebook" value={s.social.facebook} />
            <In label="TikTok (URL)" name="tiktok" value={s.social.tiktok} /><In label="YouTube (URL)" name="youtube" value={s.social.youtube} />
          </div>
        </SettingsForm>
        <div className="mt-4 border-t border-line pt-4">
          <SettingsForm settingsKey="seo">
            <In label="Título padrão" name="defaultTitle" value={s.seo.defaultTitle} maxLength={70} />
            <In label="Descrição padrão" name="defaultDescription" value={s.seo.defaultDescription} maxLength={170} />
          </SettingsForm>
        </div>
      </Panel>
    </div>
  );
}
