"use client";

import { useCallback, useSyncExternalStore } from "react";
import type { GrupoLocal } from "@/lib/types";

const CHAVE = "nexo-grupos";
const ouvintes = new Set<() => void>();
let cache: GrupoLocal[] | null = null;

function lerStorage(): GrupoLocal[] {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(CHAVE);
    const dados = raw ? (JSON.parse(raw) as GrupoLocal[]) : [];
    cache = Array.isArray(dados) ? dados : [];
  } catch {
    cache = [];
  }
  return cache;
}

function gravar(grupos: GrupoLocal[]) {
  cache = grupos;
  try {
    localStorage.setItem(CHAVE, JSON.stringify(grupos));
  } catch {}
  ouvintes.forEach((fn) => fn());
}

function subscribe(fn: () => void) {
  ouvintes.add(fn);
  return () => ouvintes.delete(fn);
}

const VAZIO: GrupoLocal[] = [];

export function useGruposLocais() {
  const grupos = useSyncExternalStore(subscribe, lerStorage, () => VAZIO);

  const salvar = useCallback((grupo: Omit<GrupoLocal, "id"> & { id?: string }) => {
    const atuais = lerStorage();
    if (grupo.id) {
      gravar(atuais.map((g) => (g.id === grupo.id ? { ...g, ...grupo, id: g.id } : g)));
      return grupo.id;
    }
    const id = crypto.randomUUID();
    gravar([...atuais, { id, nome: grupo.nome, empresas: grupo.empresas }]);
    return id;
  }, []);

  const excluir = useCallback((id: string) => {
    gravar(lerStorage().filter((g) => g.id !== id));
  }, []);

  return { grupos, salvar, excluir };
}
