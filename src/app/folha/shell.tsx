"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { ModuloHeader } from "@/components/modulo-header";
import { useIsFetching } from "@tanstack/react-query";
import { ConfFilterBar } from "@/components/filters/conf-filter-bar";
import { FiltroPendente } from "@/components/filtro-pendente";
import { ProdutividadeMenus, ProdutividadeTabsProvider } from "@/app/folha/produtividade/tabs";
import { useFiltros } from "@/hooks/use-filters";
import { limparEstadoSecao } from "@/lib/estado-secao";
import { secaoFolhaAtual } from "@/lib/folha-secoes";
import { dataBR } from "@/lib/format";

export function FolhaShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { filtros, aplicado } = useFiltros();
  const secao = secaoFolhaAtual(pathname);
  const carregando = useIsFetching() > 0;

  // Filtros de tela sobrevivem enquanto se está na seção; sair libera.
  const secaoPath = secao?.path;
  useEffect(() => {
    return () => {
      if (secaoPath) limparEstadoSecao(secaoPath);
    };
  }, [secaoPath]);

  const ehProdutividade = secao?.id === "produtividade";

  return (
    <ProdutividadeTabsProvider>
      <div className="mx-auto max-w-7xl px-6 py-6">
        <ModuloHeader
          titulo={secao?.rotulo ?? "Folha"}
          carregando={carregando}
          direita={
            <p className="hidden text-xs text-muted sm:block">
              {dataBR(filtros.inicio)} – {dataBR(filtros.fim)}
            </p>
          }
        />

        {/* Abas da Produtividade acima da barra de filtros, como na Conciliação. */}
        {ehProdutividade && <ProdutividadeMenus />}

        {/* Rotatividade se lê por empresa (uma por vez); Produtividade é o retrato
            do escritório, então empresa vira filtro opcional (todas por padrão). */}
        <ConfFilterBar mostrarFilial={false} empresaOpcional={ehProdutividade} />

        <div className="mt-5 space-y-4">{aplicado ? children : <FiltroPendente />}</div>
      </div>
    </ProdutividadeTabsProvider>
  );
}
