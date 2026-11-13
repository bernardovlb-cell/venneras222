import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { ART_KEYS, staticArtSvg } from "@/components/art/render-static";
import { artKeyFor } from "@/components/art/ToyArt";

describe("ilustrações estáticas", () => {
  it.each(ART_KEYS)("public/art/%s.svg está igual ao componente (rode `npm run art` se mudou)", (k) => {
    const file = readFileSync(path.join(import.meta.dirname, "..", "public", "art", `${k}.svg`), "utf8");
    expect(file).toBe(staticArtSvg(k));
  });

  it("categorias conhecidas e novas recebem ilustração coerente", () => {
    expect(artKeyFor("pelucias")).toBe("teddy");
    expect(artKeyFor("carrinhos-e-pistas")).toBe("car");
    expect(artKeyFor("quebra-cabecas")).toBe("puzzle");
    expect(artKeyFor("brinquedos-para-bebes")).toBe("rattle");
    expect(ART_KEYS).toContain(artKeyFor("categoria-qualquer-nova"));
  });
});
