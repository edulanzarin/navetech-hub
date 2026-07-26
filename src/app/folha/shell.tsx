"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import Image from "next/image";
import { Loader2 } from "lucide-react";
import { useIsFetching } from "@tanstack/react-query";
import { ConfFilterBar } from "@/components/filters/conf-filter-bar";
import { FiltroPendente } from "@/components/filtro-pendente";
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

  return (
    <div className="mx-auto max-w-7xl px-6 py-6">
      <header className="mb-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Image src="/images/folha.ico" alt="" width={40} height={40} unoptimized className="size-10" />
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted">Folha</p>
            <h1 className="text-xl font-semibold tracking-tight">{secao?.rotulo ?? "Folha"}</h1>
            {secao && <p className="text-xs text-muted">{secao.descricao}</p>}
          </div>
        </div>
        <div className="flex items-center gap-4">
          {carregando && (
            <span className="anim-fade-in flex items-center gap-2 text-xs text-muted">
              <Loader2 className="size-4 animate-spin" />
              Atualizando…
            </span>
          )}
          <p className="hidden text-xs text-muted sm:block">
            {dataBR(filtros.inicio)} – {dataBR(filtros.fim)}
          </p>
        </div>
      </header>

      {/* Uma empresa por vez: rotatividade se lê por empresa, não somando o
          escritório todo. A ConfFilterBar já traz empresa obrigatória + período. */}
      <ConfFilterBar mostrarFilial={false} />

      <div className="mt-5 space-y-4">{aplicado ? children : <FiltroPendente />}</div>
    </div>
  );
}
