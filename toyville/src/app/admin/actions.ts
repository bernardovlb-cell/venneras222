"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { requirePermission } from "@/server/auth/guards";
import { login } from "@/server/services/account";
import { createFirstOwner } from "@/server/services/setup";
import { requestMeta } from "@/server/http";
import { toActionError, type ActionResult, AppError } from "@/server/errors";
import * as P from "@/server/services/admin-products";
import * as A from "@/server/services/admin";
import { readSpreadsheet, planImport, executeImport, type ImportPlan } from "@/server/services/import";
import { updateFulfillment, cancelUnpaidOrder, requestRefund, reconcileOrder } from "@/server/services/orders";
import { moderateReview } from "@/server/services/reviews";
import { replyTicket } from "@/server/services/support";
import { saveSettings, settingsSchemas, type SettingsKey } from "@/server/settings";
import { storeImage } from "@/server/storage";
import { removeNewsletterSubscriber } from "@/server/services/newsletter";
import { audit } from "@/server/audit";
import { db } from "@/server/db/client";
import { banners, coupons, externalListings, promotions, supportTickets } from "@/server/db/schema";
import { parseBRLToCents } from "@/lib/money";

type R<T = unknown> = Promise<ActionResult<T>>;
const str = (fd: FormData, k: string) => String(fd.get(k) ?? "");
const bool = (fd: FormData, k: string) => fd.get(k) === "on" || fd.get(k) === "true";
const all = (fd: FormData, k: string) => fd.getAll(k).map(String).filter(Boolean);
const refresh = () => revalidatePath("/", "layout");

async function run<T>(fn: () => Promise<T | void>, message = "Salvo."): R<T> {
  try {
    const data = await fn();
    refresh();
    return { ok: true, data: (data ?? undefined) as T, message };
  } catch (e) {
    return toActionError(e);
  }
}

/* ---------------------------------------------------------------- login */
export async function adminLoginAction(_: unknown, fd: FormData): Promise<ActionResult> {
  try {
    await login(str(fd, "email"), str(fd, "password"), await requestMeta(), { staffOnly: true });
  } catch (e) {
    return toActionError(e);
  }
  redirect("/admin");
}

export async function firstOwnerAction(_: unknown, fd: FormData): Promise<ActionResult> {
  try {
    await createFirstOwner({ token: str(fd, "token"), name: str(fd, "name"), email: str(fd, "email"), password: str(fd, "password") }, await requestMeta());
  } catch (e) {
    return toActionError(e);
  }
  redirect("/admin");
}

/* ---------------------------------------------------------------- produtos */
const productFields = ["name", "slug", "sku", "gtin", "shortDescription", "description", "brandId", "manufacturer", "categoryId", "minAgeMonths", "maxAgeMonths", "status", "safetyInfo", "certifications", "weightGrams", "lengthCm", "widthCm", "heightCm", "seoTitle", "seoDescription"];

export async function saveProductAction(_: unknown, fd: FormData): R {
  let newId: string | null = null;
  try {
    const u = await requirePermission("products.write");
    const id = str(fd, "id") || undefined;
    const data = Object.fromEntries(productFields.map((k) => [k, str(fd, k)]));
    if (!data.status) data.status = "draft";
    const saved = await P.saveProduct(data, u.id, id);
    if (!id) newId = saved;
    refresh();
    if (id) return { ok: true, message: "Produto salvo." };
  } catch (e) {
    return toActionError(e);
  }
  redirect(`/admin/produtos/${newId}?novo=1`);
}

export async function saveVariantAction(_: unknown, fd: FormData): R {
  return run(async () => {
    const u = await requirePermission("products.write");
    await P.saveVariant(str(fd, "productId"), {
      sku: str(fd, "sku"), name: str(fd, "name"), options: str(fd, "options"), price: str(fd, "price"), salePrice: str(fd, "salePrice"),
      saleStartsAt: str(fd, "saleStartsAt"), saleEndsAt: str(fd, "saleEndsAt"), stock: str(fd, "stock"), weightGrams: str(fd, "weightGrams"),
      imageId: str(fd, "imageId"), isActive: bool(fd, "isActive"), position: str(fd, "position") || "0",
    }, u.id, str(fd, "variantId") || undefined);
  }, "Variação salva.");
}

export async function deleteVariantAction(productId: string, variantId: string): R {
  return run(async () => { const u = await requirePermission("products.write"); await P.deleteVariant(productId, variantId, u.id); }, "Variação removida (ou desativada, se já vendida).");
}

export async function adjustStockAction(_: unknown, fd: FormData): R {
  return run(async () => {
    const u = await requirePermission("products.write");
    const n = Number(str(fd, "stock"));
    if (!Number.isInteger(n)) throw new AppError("stock", "Informe um número inteiro.", 400, "stock");
    await P.adjustStock(str(fd, "variantId"), n, str(fd, "note"), u.id);
  }, "Estoque ajustado.");
}

export async function uploadImagesAction(_: unknown, fd: FormData): R<{ errors: string[] }> {
  try {
    const u = await requirePermission("products.write");
    const r = await P.uploadImages(str(fd, "productId"), fd.getAll("files").filter((f): f is File => f instanceof File), u.id);
    refresh();
    return { ok: true, data: { errors: r.errors }, message: `${r.ok} imagem(ns) enviada(s).${r.errors.length ? " Algumas falharam." : ""}` };
  } catch (e) {
    return toActionError(e);
  }
}

export async function imageOpAction(productId: string, imageId: string, op: "up" | "down" | "first" | "delete"): R {
  return run(async () => {
    const u = await requirePermission("products.write");
    if (op === "delete") await P.deleteImage(productId, imageId, u.id);
    else await P.reorderImage(productId, imageId, op, u.id);
  });
}

export async function imageAltAction(_: unknown, fd: FormData): R {
  return run(async () => { await requirePermission("products.write"); await P.updateImageAlt(str(fd, "productId"), str(fd, "imageId"), str(fd, "alt")); });
}

export async function replaceImageAction(_: unknown, fd: FormData): R {
  return run(async () => {
    const u = await requirePermission("products.write");
    const f = fd.get("file");
    if (!(f instanceof File) || !f.size) throw new AppError("file", "Selecione a nova imagem.");
    await P.replaceImage(str(fd, "productId"), str(fd, "imageId"), f, u.id);
  }, "Imagem substituída.");
}

export async function deleteProductAction(productId: string): R<{ result: string }> {
  return run(async () => { const u = await requirePermission("products.write"); return { result: await P.deleteOrArchiveProduct(productId, u.id) }; }, "Concluído.");
}

/* ---------------------------------------------------------------- importação */
export async function importAction(_: unknown, fd: FormData): R<{ plan?: ImportPlan; done?: boolean }> {
  try {
    const u = await requirePermission("products.write");
    const f = fd.get("file");
    if (!(f instanceof File) || !f.size) throw new AppError("file", "Selecione a planilha.");
    const rows = await readSpreadsheet(f);
    if (fd.get("confirm") === "1") {
      const summary = await executeImport(rows, u.id);
      refresh();
      return { ok: true, data: { done: true }, message: `Importação concluída: ${summary.create} produto(s) criado(s), ${summary.update} atualizado(s), ${summary.variants} variação(ões).` };
    }
    const plan = await planImport(rows);
    return { ok: true, data: { plan } };
  } catch (e) {
    return toActionError(e);
  }
}

/* ---------------------------------------------------------------- categorias e marcas */
export async function saveCategoryAction(_: unknown, fd: FormData): R {
  return run(async () => {
    const u = await requirePermission("products.write");
    const file = fd.get("image");
    const image = bool(fd, "removeImage") ? { imageUrl: null }
      : file instanceof File && file.size ? { imageUrl: (await storeImage(file, "categorias")).thumbUrl }
      : undefined;
    await P.saveCategory({ name: str(fd, "name"), slug: str(fd, "slug"), parentId: str(fd, "parentId"), description: str(fd, "description"), position: str(fd, "position") || "0", isActive: bool(fd, "isActive"), isFeatured: bool(fd, "isFeatured") }, u.id, str(fd, "id") || undefined, image);
  }, "Categoria salva.");
}
export async function deleteCategoryAction(id: string): R { return run(async () => { const u = await requirePermission("products.write"); await P.deleteCategory(id, u.id); }, "Categoria excluída."); }
export async function saveBrandAction(_: unknown, fd: FormData): R {
  return run(async () => { const u = await requirePermission("products.write"); await P.saveBrand(str(fd, "name"), bool(fd, "isActive"), u.id, str(fd, "id") || undefined); }, "Marca salva.");
}
export async function deleteBrandAction(id: string): R { return run(async () => { const u = await requirePermission("products.write"); await P.deleteBrand(id, u.id); }, "Marca excluída."); }

/* ---------------------------------------------------------------- pedidos */
export async function fulfillmentAction(_: unknown, fd: FormData): R {
  return run(async () => {
    const u = await requirePermission("orders.write");
    await updateFulfillment(str(fd, "orderId"), str(fd, "next") as Parameters<typeof updateFulfillment>[1], u.id, { trackingCode: str(fd, "trackingCode") || undefined, trackingUrl: str(fd, "trackingUrl") || undefined, note: str(fd, "note") || undefined });
    await audit({ userId: u.id, action: "order.fulfillment", entity: "order", entityId: str(fd, "orderId"), data: { next: str(fd, "next") } });
  }, "Pedido atualizado.");
}
export async function cancelOrderAction(_: unknown, fd: FormData): R {
  return run(async () => {
    const u = await requirePermission("orders.write");
    const reason = str(fd, "reason").trim();
    if (reason.length < 3) throw new AppError("reason", "Informe o motivo.", 400, "reason");
    await cancelUnpaidOrder(str(fd, "orderId"), reason, u.id);
    await audit({ userId: u.id, action: "order.cancel", entity: "order", entityId: str(fd, "orderId"), data: { reason } });
  }, "Pedido cancelado e estoque liberado.");
}
export async function refundAction(_: unknown, fd: FormData): R {
  return run(async () => {
    const u = await requirePermission("orders.refund");
    const reason = str(fd, "reason").trim();
    if (reason.length < 3) throw new AppError("reason", "Informe o motivo.", 400, "reason");
    const amount = str(fd, "amount") ? parseBRLToCents(str(fd, "amount")) : null;
    if (str(fd, "amount") && amount == null) throw new AppError("amount", "Valor inválido.", 400, "amount");
    const outcome = await requestRefund(str(fd, "orderId"), amount, u.id, reason);
    await audit({ userId: u.id, action: "order.refund", entity: "order", entityId: str(fd, "orderId"), data: { amount, reason, outcome } });
  }, "Reembolso solicitado ao Mercado Pago. O status é atualizado conforme a confirmação.");
}
export async function reconcileAction(orderId: string): R {
  return run(async () => { const u = await requirePermission("orders.read"); await reconcileOrder(orderId); await audit({ userId: u.id, action: "order.reconcile", entity: "order", entityId: orderId }); }, "Consultado no Mercado Pago.");
}
export async function orderFieldsAction(_: unknown, fd: FormData): R {
  return run(async () => {
    const u = await requirePermission("orders.write");
    await A.updateOrderAdminFields(str(fd, "orderId"), { notes: str(fd, "notes"), fiscalStatus: str(fd, "fiscalStatus"), invoiceNumber: str(fd, "invoiceNumber"), invoiceKey: str(fd, "invoiceKey"), invoiceUrl: str(fd, "invoiceUrl"), clearAttention: bool(fd, "clearAttention") }, u.id);
  });
}

/* ---------------------------------------------------------------- promoções */
export async function saveCouponAction(_: unknown, fd: FormData): R {
  return run(async () => {
    const u = await requirePermission("promotions.write");
    await A.saveCoupon({
      code: str(fd, "code"), description: str(fd, "description"), type: str(fd, "type"), value: str(fd, "value"), minSubtotal: str(fd, "minSubtotal"), maxDiscount: str(fd, "maxDiscount"),
      startsAt: str(fd, "startsAt"), endsAt: str(fd, "endsAt"), usageLimit: str(fd, "usageLimit"), usageLimitPerCustomer: str(fd, "usageLimitPerCustomer"),
      combinableWithPromotions: bool(fd, "combinableWithPromotions"), isActive: bool(fd, "isActive"), categoryIds: all(fd, "categoryIds"), productIds: all(fd, "productIds"), brandIds: all(fd, "brandIds"),
    }, u.id, str(fd, "id") || undefined);
  }, "Cupom salvo.");
}
export async function savePromotionAction(_: unknown, fd: FormData): R {
  return run(async () => {
    const u = await requirePermission("promotions.write");
    await A.savePromotion({
      name: str(fd, "name"), kind: str(fd, "kind"), value: str(fd, "value"), minSubtotal: str(fd, "minSubtotal"), startsAt: str(fd, "startsAt"), endsAt: str(fd, "endsAt"),
      isFlash: bool(fd, "isFlash"), badge: str(fd, "badge"), isActive: bool(fd, "isActive"), all: bool(fd, "all"),
      categoryIds: all(fd, "categoryIds"), productIds: all(fd, "productIds"), brandIds: all(fd, "brandIds"),
    }, u.id, str(fd, "id") || undefined);
  }, "Promoção salva.");
}
export async function toggleRecordAction(kind: "coupon" | "promotion" | "banner", id: string, active: boolean): R {
  return run(async () => {
    const u = await requirePermission(kind === "banner" ? "content.write" : "promotions.write");
    const t = kind === "coupon" ? coupons : kind === "promotion" ? promotions : banners;
    await db.update(t).set({ isActive: active }).where(eq(t.id, id));
    await audit({ userId: u.id, action: `${kind}.toggle`, entity: kind, entityId: id, data: { active } });
  });
}
export async function deleteRecordAction(kind: "promotion" | "banner" | "listing", id: string): R {
  return run(async () => {
    const u = await requirePermission(kind === "banner" ? "content.write" : kind === "listing" ? "integrations.manage" : "promotions.write");
    const t = kind === "promotion" ? promotions : kind === "banner" ? banners : externalListings;
    await db.delete(t).where(eq(t.id, id));
    await audit({ userId: u.id, action: `${kind}.delete`, entity: kind, entityId: id });
  }, "Excluído.");
}

/* ---------------------------------------------------------------- conteúdo */
export async function saveBannerAction(_: unknown, fd: FormData): R {
  return run(async () => {
    const u = await requirePermission("content.write");
    const imgs: { imageUrl?: string | null; mobileImageUrl?: string | null } = {};
    const f1 = fd.get("image"), f2 = fd.get("mobileImage");
    if (f1 instanceof File && f1.size) imgs.imageUrl = (await storeImage(f1, "banners")).url;
    if (f2 instanceof File && f2.size) imgs.mobileImageUrl = (await storeImage(f2, "banners")).url;
    if (bool(fd, "removeImage")) { imgs.imageUrl = null; imgs.mobileImageUrl = null; }
    await A.saveBanner({ placement: str(fd, "placement") || "hero", title: str(fd, "title"), subtitle: str(fd, "subtitle"), linkUrl: str(fd, "linkUrl"), ctaLabel: str(fd, "ctaLabel"), theme: str(fd, "theme") || "blue", textPosition: str(fd, "textPosition") || "left", imageMode: str(fd, "imageMode") || "cover", position: str(fd, "position") || "0", startsAt: str(fd, "startsAt"), endsAt: str(fd, "endsAt"), isActive: bool(fd, "isActive") }, imgs, u.id, str(fd, "id") || undefined);
  }, "Banner salvo.");
}
export async function moveBannerAction(id: string, direction: "up" | "down"): R {
  return run(async () => { const u = await requirePermission("content.write"); await A.moveBanner(id, direction, u.id); }, "Ordem atualizada.");
}
export async function removeNewsletterSubscriberAction(id: string): R {
  return run(async () => { const u = await requirePermission("support.handle"); await removeNewsletterSubscriber(id, u.id); }, "Inscrição removida.");
}
export async function saveHomeSectionAction(_: unknown, fd: FormData): R {
  return run(async () => {
    const u = await requirePermission("content.write");
    await A.saveHomeSection(str(fd, "id"), { title: str(fd, "title"), subtitle: str(fd, "subtitle"), position: Number(str(fd, "position")), isActive: bool(fd, "isActive"), limit: Number(str(fd, "limit")) || undefined }, u.id);
  }, "Seção salva.");
}
export async function savePageAction(_: unknown, fd: FormData): R {
  return run(async () => {
    const u = await requirePermission("content.write");
    await A.savePage(str(fd, "slug"), { title: str(fd, "title"), body: str(fd, "body"), status: str(fd, "status"), pendingNotes: str(fd, "pendingNotes") }, u.id, fd.get("create") === "1");
  }, "Página salva.");
}

/* ---------------------------------------------------------------- avaliações e atendimento */
export async function moderateReviewAction(id: string, status: "approved" | "rejected"): R {
  return run(async () => { const u = await requirePermission("reviews.moderate"); await moderateReview(id, status, null); await audit({ userId: u.id, action: `review.${status}`, entity: "review", entityId: id }); }, status === "approved" ? "Avaliação publicada." : "Avaliação rejeitada.");
}
export async function staffReplyAction(_: unknown, fd: FormData): R {
  return run(async () => {
    const u = await requirePermission("support.handle");
    const body = str(fd, "body").trim();
    if (body) await replyTicket(str(fd, "ticketId"), { type: "staff", userId: u.id }, body, str(fd, "status") || undefined);
    else if (str(fd, "status")) await db.update(supportTickets).set({ status: str(fd, "status") as "open", updatedAt: new Date() }).where(eq(supportTickets.id, str(fd, "ticketId")));
    await audit({ userId: u.id, action: "ticket.reply", entity: "ticket", entityId: str(fd, "ticketId") });
  }, "Atendimento atualizado.");
}

/* ---------------------------------------------------------------- configurações */
export async function saveSettingsAction(_: unknown, fd: FormData): R {
  return run(async () => {
    const u = await requirePermission("settings.write");
    const key = str(fd, "key") as SettingsKey;
    if (!(key in settingsSchemas)) throw new AppError("key", "Configuração inválida.");
    const raw = JSON.parse(str(fd, "json") || "{}") as Record<string, unknown>;
    if (key === "brand") {
      const logo = fd.get("logo");
      if (logo instanceof File && logo.size) {
        const img = await storeImage(logo, "marca");
        Object.assign(raw, { logoUrl: img.url, logoWidth: img.width, logoHeight: img.height });
      }
    }
    if (key === "fiscal" && raw.autoIssue === true) throw new AppError("fiscal", "A emissão automática só pode ser ativada quando a integração com o emissor fiscal estiver implementada e validada.", 400, "autoIssue");
    await saveSettings(key, raw);
    await audit({ userId: u.id, action: "settings.update", entity: "settings", entityId: key });
  }, "Configurações salvas.");
}
export async function saveShippingAction(_: unknown, fd: FormData): R {
  return run(async () => {
    const u = await requirePermission("settings.write");
    const config = JSON.parse(str(fd, "config") || "{}");
    await A.saveShippingMethod(str(fd, "id"), { name: str(fd, "name"), isActive: bool(fd, "isActive"), config }, u.id);
  }, "Modalidade salva.");
}

/* ---------------------------------------------------------------- usuários */
export async function createStaffAction(_: unknown, fd: FormData): R {
  return run(async () => { const u = await requirePermission("users.manage"); await A.createStaff({ name: str(fd, "name"), email: str(fd, "email"), password: str(fd, "password"), roleKey: str(fd, "roleKey") }, u); }, "Usuário criado. Envie a senha inicial por um canal seguro e peça para trocá-la.");
}
export async function updateStaffAction(_: unknown, fd: FormData): R {
  return run(async () => { const u = await requirePermission("users.manage"); await A.updateStaff(str(fd, "userId"), { roleKey: str(fd, "roleKey"), isActive: bool(fd, "isActive") }, u); }, "Usuário atualizado.");
}
export async function updateRoleAction(_: unknown, fd: FormData): R {
  return run(async () => { const u = await requirePermission("users.manage"); await A.updateRolePermissions(str(fd, "key"), all(fd, "permissions"), u.id); }, "Permissões salvas.");
}

/* ---------------------------------------------------------------- integrações */
export async function saveListingAction(_: unknown, fd: FormData): R {
  return run(async () => { const u = await requirePermission("integrations.manage"); await A.saveExternalListing({ channel: str(fd, "channel"), sku: str(fd, "sku"), externalId: str(fd, "externalId"), externalSku: str(fd, "externalSku") }, u.id); }, "Anúncio vinculado.");
}
