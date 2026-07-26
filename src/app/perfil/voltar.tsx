"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";

/** Volta para a tela anterior (o módulo de onde a pessoa veio), com fallback pro Hub. */
export function Voltar() {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => (history.length > 1 ? router.back() : router.push("/"))}
      className="flex items-center gap-1.5 text-xs text-muted transition-colors hover:text-ink"
    >
      <ChevronLeft className="size-3.5" />
      Voltar
    </button>
  );
}
