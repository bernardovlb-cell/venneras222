import { describe, it, expect, beforeEach } from "vitest";
import { eq, sql } from "drizzle-orm";
import { db } from "@/server/db/client";
import * as s from "@/server/db/schema";
import { executeImport, planImport } from "@/server/services/import";
import { saveVariant, deleteOrArchiveProduct, adjustStock, saveCategory } from "@/server/services/admin-products";
import { submitReview } from "@/server/services/reviews";
import { anonymizeAccount } from "@/server/services/account";
import { hasPermission, DEFAULT_ROLES } from "@/server/auth/permissions";
import { hashPassword, verifyPassword } from "@/server/auth/password";
import { savePromotion, saveCoupon, updateStaff } from "@/server/services/admin";
import { resetDb, makeProduct } from "./helpers";

const ADMIN = "00000000-0000-0000-0000-000000000001";
beforeEach(resetDb);

describe("importação de produtos", () => {
  it("cria produto com variações e estoque registrado em movimentações", async () => {
    const sum = await executeImport([
      { produto_sku: "IMP-1", nome: "Pelúcia Importada", categoria: "pelucias", marca: "Marca X", preco: "50,00", estoque: "3", variacao_sku: "IMP-1-A", opcoes: "Cor=Azul", status: "ativo" },
      { produto_sku: "IMP-1", variacao_sku: "IMP-1-R", opcoes: "Cor=Rosa", preco: "50,00", estoque: "2" },
    ], ADMIN);
    expect(sum).toMatchObject({ create: 1, update: 0, variants: 2 });
    const p = (await db.select().from(s.products).where(eq(s.products.sku, "IMP-1")))[0];
    expect(p.status).toBe("active");
    const vs = await db.select().from(s.productVariants).where(eq(s.productVariants.productId, p.id));
    expect(vs.map((v) => v.stockOnHand).sort()).toEqual([2, 3]);
    const moves = await db.select().from(s.inventoryMovements);
    expect(moves.every((m) => m.reason === "import")).toBe(true);
  });

  it("atualização é segura: status/estoque vazios não alteram o existente", async () => {
    await executeImport([{ produto_sku: "IMP-2", nome: "Bola", preco: "10,00", estoque: "5", status: "ativo" }], ADMIN);
    await executeImport([{ produto_sku: "IMP-2", nome: "Bola Nova", preco: "12,00" }], ADMIN);
    const p = (await db.select().from(s.products).where(eq(s.products.sku, "IMP-2")))[0];
    const v = (await db.select().from(s.productVariants).where(eq(s.productVariants.sku, "IMP-2")))[0];
    expect(p.name).toBe("Bola Nova");
    expect(p.status).toBe("active");
    expect(v.priceCents).toBe(1200);
    expect(v.stockOnHand).toBe(5);
  });

  it("tudo ou nada: com erro em uma linha nada é gravado", async () => {
    await expect(executeImport([
      { produto_sku: "OK-1", nome: "Ok", preco: "10" },
      { produto_sku: "ERR-1", nome: "Erro", preco: "10", categoria: "categoria-inexistente" },
    ], ADMIN)).rejects.toThrow(/erro/);
    expect((await db.select().from(s.products).where(eq(s.products.sku, "OK-1"))).length).toBe(0);
  });

  it("detecta SKU de variação que pertence a outro produto", async () => {
    const { variantId } = await makeProduct();
    const v = (await db.select().from(s.productVariants).where(eq(s.productVariants.id, variantId)))[0];
    const plan = await planImport([{ produto_sku: "NOVO-9", nome: "Outro", preco: "10", variacao_sku: v.sku }]);
    expect(plan.issues.some((i) => i.message.includes("já pertence"))).toBe(true);
  });

  it("estoque não pode ficar abaixo do reservado", async () => {
    const { variantId } = await makeProduct({ stock: 5 });
    await db.update(s.productVariants).set({ stockReserved: 3 }).where(eq(s.productVariants.id, variantId));
    await expect(adjustStock(variantId, 2, "contagem", ADMIN)).rejects.toThrow(/reservada/);
    await adjustStock(variantId, 4, "contagem", ADMIN);
  });
});

describe("cadastro administrativo", () => {
  it("variação: preço promocional deve ser menor que o normal e SKU é único", async () => {
    const { productId, variantId } = await makeProduct();
    const sku = (await db.select().from(s.productVariants).where(eq(s.productVariants.id, variantId)))[0].sku;
    await expect(saveVariant(productId, { sku: "NV-1", name: "X", price: "10,00", salePrice: "12,00", isActive: true }, ADMIN)).rejects.toThrow(/menor/);
    await expect(saveVariant(productId, { sku, name: "X", price: "10,00", isActive: true }, ADMIN)).rejects.toThrow(/SKU já usado/);
    const id = await saveVariant(productId, { sku: "NV-2", name: "Azul", options: "Cor=Azul", price: "10,00", stock: "3", isActive: true }, ADMIN);
    const v = (await db.select().from(s.productVariants).where(eq(s.productVariants.id, id)))[0];
    expect(v.options).toEqual({ Cor: "Azul" });
    expect(v.stockOnHand).toBe(3);
  });

  it("produto vendido é arquivado (não excluído) para preservar histórico", async () => {
    const { productId } = await makeProduct();
    const [o] = await db.insert(s.orders).values({ accessTokenHash: "x", email: "a@b.c", customerName: "A", subtotalCents: 100, listSubtotalCents: 100, totalCents: 100, shippingMethodCode: "r", shippingMethodName: "R", shippingType: "pickup" }).returning();
    await db.insert(s.orderItems).values({ orderId: o.id, productId, sku: "x", productName: "x", quantity: 1, listUnitCents: 100, unitCents: 100, totalCents: 100 });
    expect(await deleteOrArchiveProduct(productId, ADMIN)).toBe("archived");
    const { productId: p2 } = await makeProduct();
    expect(await deleteOrArchiveProduct(p2, ADMIN)).toBe("deleted");
  });

  it("categoria: foto é gravada, mantida quando o formulário vem sem arquivo e removida quando pedido", async () => {
    const base = { name: "Fantasias", slug: "fantasias", parentId: "", description: "", position: "0", isActive: true, isFeatured: false };
    await saveCategory(base, ADMIN, undefined, { imageUrl: "/uploads/categorias/a-480.webp" });
    const [c] = await db.select().from(s.categories).where(eq(s.categories.slug, "fantasias"));
    expect(c.imageUrl).toBe("/uploads/categorias/a-480.webp");
    await saveCategory({ ...base, description: "Nova" }, ADMIN, c.id); // sem arquivo: mantém
    expect((await db.select().from(s.categories).where(eq(s.categories.id, c.id)))[0]).toMatchObject({ imageUrl: "/uploads/categorias/a-480.webp", description: "Nova" });
    await saveCategory(base, ADMIN, c.id, { imageUrl: null }); // remover
    expect((await db.select().from(s.categories).where(eq(s.categories.id, c.id)))[0].imageUrl).toBeNull();
  });

  it("promoção sem escopo é recusada; relâmpago exige data de término", async () => {
    await expect(savePromotion({ name: "Promo X", kind: "percent_off", value: "10", isFlash: false, isActive: true, all: false }, ADMIN)).rejects.toThrow(/onde a promoção vale/);
    await expect(savePromotion({ name: "Promo X", kind: "percent_off", value: "10", isFlash: true, isActive: true, all: true }, ADMIN)).rejects.toThrow(/término/);
    await expect(saveCoupon({ code: "AB", type: "percent", value: "10", combinableWithPromotions: false, isActive: true, usageLimit: "", usageLimitPerCustomer: "" }, ADMIN)).rejects.toThrow();
  });
});

describe("permissões", () => {
  it("papéis padrão seguem o menor privilégio", () => {
    const role = (k: string) => DEFAULT_ROLES.find((r) => r.key === k)!.permissions;
    expect(hasPermission(role("owner"), "users.manage")).toBe(true);
    expect(hasPermission(role("admin"), "users.manage")).toBe(false);
    expect(hasPermission(role("staff"), "orders.refund")).toBe(false);
    expect(hasPermission(role("staff"), "settings.write")).toBe(false);
    expect(hasPermission(role("staff"), "orders.write")).toBe(true);
    expect(hasPermission(role("customer"), "dashboard.view")).toBe(false);
  });

  it("não permite remover o último proprietário", async () => {
    const [o] = await db.insert(s.users).values({ email: "dono@x.com", name: "Dono", roleKey: "owner" }).returning();
    const [a] = await db.insert(s.users).values({ email: "adm@x.com", name: "Adm", roleKey: "owner" }).returning();
    await updateStaff(a.id, { roleKey: "staff", isActive: true }, { id: o.id, roleKey: "owner" });
    await expect(updateStaff(o.id, { roleKey: "staff", isActive: true }, { id: a.id, roleKey: "owner" })).rejects.toThrow(/ao menos um proprietário/);
  });

  it("senhas com scrypt: confere e rejeita", async () => {
    const h = await hashPassword("Senha1234");
    expect(h.startsWith("scrypt$")).toBe(true);
    expect(await verifyPassword("Senha1234", h)).toBe(true);
    expect(await verifyPassword("senha1234", h)).toBe(false);
    expect(await verifyPassword("x", null)).toBe(false);
  });
});

describe("avaliações", () => {
  it("entra pendente, sem duplicidade, marca compra verificada e sinaliza links", async () => {
    const { productId } = await makeProduct();
    const [u] = await db.insert(s.users).values({ email: "c@x.com", name: "Maria Souza" }).returning();
    await submitReview({ id: u.id, name: u.name }, { productId, rating: 5, body: "Meu filho adorou, muito resistente!" }, "1.1.1.1");
    const r = (await db.select().from(s.reviews))[0];
    expect(r).toMatchObject({ status: "pending", verifiedPurchase: false, authorName: "Maria S." });
    await expect(submitReview({ id: u.id, name: u.name }, { productId, rating: 4, body: "Outra avaliação qualquer" }, "1.1.1.1")).rejects.toThrow(/já avaliou/);
    const [u2] = await db.insert(s.users).values({ email: "d@x.com", name: "Spammer" }).returning();
    await submitReview({ id: u2.id, name: u2.name }, { productId, rating: 5, body: "Compre aqui https://golpe.example" }, "1.1.1.2");
    const flagged = (await db.select().from(s.reviews).where(eq(s.reviews.userId, u2.id)))[0];
    expect(flagged.moderationNote).toMatch(/Sinalizada/);
  });
});

describe("LGPD", () => {
  it("exclusão de conta anonimiza dados pessoais e mantém pedidos", async () => {
    const [u] = await db.insert(s.users).values({ email: "lgpd@x.com", name: "Pessoa Real", phone: "11999999999", passwordHash: "x" }).returning();
    await db.insert(s.addresses).values({ userId: u.id, recipient: "Pessoa", zip: "01000000", street: "Rua", number: "1", district: "B", city: "C", state: "SP" });
    await db.insert(s.orders).values({ userId: u.id, accessTokenHash: "x", email: "lgpd@x.com", customerName: "Pessoa Real", subtotalCents: 100, listSubtotalCents: 100, totalCents: 100, shippingMethodCode: "r", shippingMethodName: "R", shippingType: "pickup" });
    await anonymizeAccount(u.id, { ip: "1.1.1.1" });
    const after = (await db.select().from(s.users).where(eq(s.users.id, u.id)))[0];
    expect(after.email).not.toContain("lgpd@");
    expect(after.phone).toBeNull();
    expect(after.passwordHash).toBeNull();
    expect(after.isActive).toBe(false);
    expect((await db.select().from(s.addresses).where(eq(s.addresses.userId, u.id))).length).toBe(0);
    expect((await db.execute<{ n: number }>(sql`select count(*)::int as n from orders where user_id = ${u.id}`)).rows[0].n).toBe(1);
  });
});

describe("primeiro acesso", () => {
  it("exige código, cria um único proprietário e não funciona depois", async () => {
    const { createFirstOwner, ownerExists } = await import("@/server/services/setup");
    process.env.SETUP_TOKEN = "codigo-secreto-de-teste-123";
    const base = { name: "Dona da Loja", email: "dona@x.com", password: "Senha1234" };
    const meta = { ip: "9.9.9.9", userAgent: "t" };
    await expect(createFirstOwner({ ...base, token: "errado" }, meta)).rejects.toThrow(/incorreto/);
    expect(await ownerExists()).toBe(false);
    // createSession usa cookies() da requisição; fora do Next ela falha DEPOIS de gravar — o que importa aqui é o banco
    await createFirstOwner({ ...base, token: "codigo-secreto-de-teste-123" }, meta).catch(() => {});
    expect(await ownerExists()).toBe(true);
    await expect(createFirstOwner({ ...base, email: "outra@x.com", token: "codigo-secreto-de-teste-123" }, meta)).rejects.toThrow(/já foi criado/);
    const owners = await db.select().from(s.users).where(eq(s.users.roleKey, "owner"));
    expect(owners).toHaveLength(1);
    delete process.env.SETUP_TOKEN;
  });
});
