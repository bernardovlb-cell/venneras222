"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { produtos } from "@/data/products";
import { QUANTIDADE_MAXIMA, resolverItens, type ItemResolvido, type ItemSacola } from "@/lib/checkout";
import { CartDrawer } from "./CartDrawer";

const CHAVE = "venneras-sacola-v1";

interface CartContexto {
  itens: ItemResolvido[];
  quantidadeTotal: number;
  aberta: boolean;
  abrir: () => void;
  fechar: () => void;
  adicionar: (slug: string, cor: string, quantidade?: number) => void;
  alterarQuantidade: (slug: string, cor: string, quantidade: number) => void;
  remover: (slug: string, cor: string) => void;
}

const Ctx = createContext<CartContexto | null>(null);

function ler(): ItemSacola[] {
  try {
    const bruto = window.localStorage.getItem(CHAVE);
    if (!bruto) return [];
    const dados: unknown = JSON.parse(bruto);
    if (!Array.isArray(dados)) return [];
    return dados.filter(
      (i): i is ItemSacola =>
        i && typeof i.slug === "string" && typeof i.cor === "string" && Number.isInteger(i.quantidade) && i.quantidade > 0,
    );
  } catch {
    return [];
  }
}

function salvar(itens: ItemSacola[]) {
  try {
    window.localStorage.setItem(CHAVE, JSON.stringify(itens));
  } catch {
    // Modo privado / armazenamento cheio: a sacola continua funcionando na sessão.
  }
}

const limitar = (q: number) => Math.max(1, Math.min(QUANTIDADE_MAXIMA, Math.floor(q)));

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [brutos, setBrutos] = useState<ItemSacola[]>([]);
  const [carregada, setCarregada] = useState(false);
  const [aberta, setAberta] = useState(false);

  useEffect(() => {
    setBrutos(ler());
    setCarregada(true);
  }, []);

  useEffect(() => {
    if (carregada) salvar(brutos);
  }, [brutos, carregada]);

  const adicionar = useCallback((slug: string, cor: string, quantidade = 1) => {
    setBrutos((atual) => {
      const i = atual.findIndex((x) => x.slug === slug && x.cor === cor);
      if (i === -1) return [...atual, { slug, cor, quantidade: limitar(quantidade) }];
      const novo = [...atual];
      novo[i] = { ...novo[i], quantidade: limitar(novo[i].quantidade + quantidade) };
      return novo;
    });
    setAberta(true);
  }, []);

  const alterarQuantidade = useCallback((slug: string, cor: string, quantidade: number) => {
    setBrutos((atual) => atual.map((x) => (x.slug === slug && x.cor === cor ? { ...x, quantidade: limitar(quantidade) } : x)));
  }, []);

  const remover = useCallback((slug: string, cor: string) => {
    setBrutos((atual) => atual.filter((x) => !(x.slug === slug && x.cor === cor)));
  }, []);

  const valor = useMemo<CartContexto>(() => {
    const itens = resolverItens(brutos, produtos);
    return {
      itens,
      quantidadeTotal: itens.reduce((s, i) => s + i.quantidade, 0),
      aberta,
      abrir: () => setAberta(true),
      fechar: () => setAberta(false),
      adicionar,
      alterarQuantidade,
      remover,
    };
  }, [brutos, aberta, adicionar, alterarQuantidade, remover]);

  return (
    <Ctx.Provider value={valor}>
      {children}
      <CartDrawer />
    </Ctx.Provider>
  );
}

export function useCart() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useCart precisa estar dentro de <CartProvider>");
  return c;
}
