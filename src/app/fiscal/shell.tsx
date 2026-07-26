"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { useIsFetching } from "@tanstack/react-query";
import { ModuloHeader } from "@/components/modulo-header";
import { FilterBar } from "@/components/filters/filter-bar";
import { FiltroPendente } from "@/components/filtro-pendente";
import { useFiltros } from "@/hooks/use-filters";
import { limparEstadoSecao } from "@/lib/estado-secao";
import { secaoAtual } from "@/lib/fiscal-secoes";
import { dataBR } from "@/lib/format";

export function FiscalShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { filtros, aplicado } = useFiltros();
  const secao = secaoAtual(pathname);
  const carregando = useIsFetching() > 0;

  // Busca e filtros de tela sobrevivem enquanto se está na seção; sair libera.
  const secaoPath = secao?.path;
  useEffect(() => {
    return () => {
      if (secaoPath) limparEstadoSecao(secaoPath);
    };
  }, [secaoPath]);

  return (
    <div className="mx-auto max-w-7xl px-6 py-6">
      <ModuloHeader
        titulo={secao?.rotulo ?? "Fiscal"}
        carregando={carregando}
        direita={
          <p className="hidden text-xs text-muted sm:block">
            {dataBR(filtros.inicio)} – {dataBR(filtros.fim)}
          </p>
        }
      />

      <FilterBar mostrarMetrica={secao?.metrica ?? false} />

      <div className="mt-5 space-y-4">{aplicado ? children : <FiltroPendente />}</div>
    </div>
  );
}
