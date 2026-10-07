import type { MetadataRoute } from "next";
import { site } from "@/config/site";
import { categorias, produtos } from "@/data/products";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const rotas = [
    "/",
    "/colecao",
    ...categorias.map((c) => `/colecao/${c.slug}`),
    ...produtos.map((p) => `/produto/${p.slug}`),
    "/sobre",
    "/ajuda",
    "/politicas/trocas",
    "/politicas/privacidade",
    "/politicas/termos",
  ];
  return rotas.map((r) => ({ url: `${site.url}${r === "/" ? "" : r}` }));
}
