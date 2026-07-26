"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { Contact, Loader2 } from "lucide-react";
import { useIsFetching } from "@tanstack/react-query";
import { limparEstadoSecao } from "@/lib/estado-secao";
import { secaoRhAtual } from "@/lib/rh-secoes";

/**
 * Casca do módulo RH. Ao contrário do Folha/Contábil, não há filtro global de
 * empresa+período no topo: cada seção traz seus próprios controles (o Diretório
 * filtra por empresa; a Rotatividade tem período). O shell só monta o cabeçalho
 * da seção e mantém o padrão de limpar o estado de tela ao sair dela.
 */
export function RhShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const secao = secaoRhAtual(pathname);
  const carregando = useIsFetching() > 0;

  const secaoPath = secao?.path;
  useEffect(() => {
    return () => {
      if (secaoPath) limparEstadoSecao(secaoPath);
    };
  }, [secaoPath]);

  return (
    <div className="mx-auto max-w-7xl px-6 py-6">
      <header className="mb-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-ent/12 text-ent">
            <Contact className="size-5" />
          </span>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted">RH</p>
            <h1 className="text-xl font-semibold tracking-tight">{secao?.rotulo ?? "RH"}</h1>
            {secao && <p className="text-xs text-muted">{secao.descricao}</p>}
          </div>
        </div>
        {carregando && (
          <span className="anim-fade-in flex items-center gap-2 text-xs text-muted">
            <Loader2 className="size-4 animate-spin" />
            Atualizando…
          </span>
        )}
      </header>

      <div className="mt-5 space-y-4">{children}</div>
    </div>
  );
}
