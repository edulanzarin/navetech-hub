"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { ModuloHeader } from "@/components/modulo-header";
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
      <ModuloHeader titulo={secao?.rotulo ?? "RH"} carregando={carregando} />

      <div className="mt-5 space-y-4">{children}</div>
    </div>
  );
}
