"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { ModuloHeader } from "@/components/modulo-header";
import { useIsFetching } from "@tanstack/react-query";
import { limparEstadoModulo } from "@/hooks/use-estado-modulo";
import { secaoRhAtual } from "@/lib/rh-secoes";

/**
 * Casca do módulo RH. Cada seção traz seus próprios controles (Diretório filtra
 * por empresa; Rotatividade tem período). O estado das seções PERSISTE enquanto
 * se está no módulo (voltar a uma seção já executada mostra o resultado) e só é
 * descartado ao sair do módulo — este shell sobrevive à troca de seção e limpa
 * o estado do RH no seu unmount (Trocar módulo).
 */
export function RhShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const secao = secaoRhAtual(pathname);
  const carregando = useIsFetching() > 0;

  useEffect(() => () => limparEstadoModulo("rh/"), []);

  return (
    <div className="mx-auto max-w-7xl px-6 py-6">
      <ModuloHeader titulo={secao?.rotulo ?? "RH"} carregando={carregando} />

      <div className="mt-5 space-y-4">{children}</div>
    </div>
  );
}
