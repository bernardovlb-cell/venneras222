import type { MetadataRoute } from "next";
import { env } from "@/server/env";

export const dynamic = "force-dynamic";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/conta", "/carrinho", "/checkout", "/pedido", "/api/"] }],
    sitemap: `${env.appUrl}/sitemap.xml`,
  };
}
