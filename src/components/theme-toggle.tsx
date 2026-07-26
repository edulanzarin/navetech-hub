"use client";

import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";
import clsx from "clsx";

const CHAVE = "nexo-theme";
type Tema = "light" | "dark";

// O tema mora no <html data-theme> (aplicado pelo script anti-flash do root
// layout) e no localStorage. Lemos essa fonte externa com useSyncExternalStore
// em vez de espelhar em estado via efeito — mesmo padrão de use-grupos-locais.
const ouvintes = new Set<() => void>();

function ler(): Tema {
  return document.documentElement.dataset.theme === "light" ? "light" : "dark";
}

// No servidor o script ainda não rodou; assume o padrão e o cliente ajusta.
function noServidor(): Tema {
  return "dark";
}

function assinar(fn: () => void) {
  ouvintes.add(fn);
  return () => ouvintes.delete(fn);
}

function definir(proximo: Tema) {
  document.documentElement.dataset.theme = proximo;
  try {
    localStorage.setItem(CHAVE, proximo);
  } catch {}
  ouvintes.forEach((fn) => fn());
}

/**
 * Alterna claro/escuro. `label={false}` deixa só o ícone (canto do launcher).
 */
export function ThemeToggle({
  label = true,
  className,
}: {
  label?: boolean;
  className?: string;
}) {
  const tema = useSyncExternalStore(assinar, ler, noServidor);
  const titulo = tema === "dark" ? "Tema claro" : "Tema escuro";

  return (
    <button
      onClick={() => definir(tema === "dark" ? "light" : "dark")}
      title={titulo}
      aria-label={titulo}
      className={clsx(
        "flex items-center gap-2.5 rounded-lg text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink",
        label ? "px-3 py-2 text-sm" : "size-9 justify-center",
        className
      )}
    >
      {tema === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
      {label && titulo}
    </button>
  );
}
