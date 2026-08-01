"use client";

import {
  useCallback,
  useState,
  useSyncExternalStore,
  type Dispatch,
  type SetStateAction,
} from "react";
import { usePathname } from "next/navigation";
import { assinarEstado, guardarEstado, idDaSecao, lerEstado } from "@/lib/estado-secao";

/**
 * `useState` que sobrevive à navegação dentro do MÓDULO (troca de aba e de seção)
 * e é descartado só ao sair do módulo — quem descarta é o shell, no seu unmount.
 *
 * Seção e página saem do caminho, então a tela só declara o nome do campo, e
 * `campo` só precisa ser único dentro da própria página: duas abas da mesma
 * seção podem ter cada uma a sua `busca` sem uma enxergar a da outra.
 *
 * O valor vem do store por `useSyncExternalStore`, então duas instâncias do
 * MESMO campo — os controles que a barra do shell renderiza e a página — veem
 * e mudam o mesmo valor, em sincronia.
 */
export function useEstadoSecao<T>(
  campo: string,
  inicial: T
): [T, Dispatch<SetStateAction<T>>] {
  const pagina = usePathname();
  const secao = idDaSecao(pagina);

  // Congela o inicial do primeiro render (igual ao initializer de useState):
  // um literal `{}` na chamada não pode invalidar `definir` a cada render.
  const [inicialFixo] = useState(inicial);

  const guardado = useSyncExternalStore(
    assinarEstado,
    () => lerEstado<T>(secao, pagina, campo),
    () => undefined
  );
  const valor = guardado === undefined ? inicialFixo : guardado;

  const definir = useCallback<Dispatch<SetStateAction<T>>>(
    (acao) => {
      const anterior = lerEstado<T>(secao, pagina, campo);
      const base = anterior === undefined ? inicialFixo : anterior;
      const proximo = typeof acao === "function" ? (acao as (a: T) => T)(base) : acao;
      guardarEstado(secao, pagina, campo, proximo);
    },
    [secao, pagina, campo, inicialFixo]
  );

  return [valor, definir];
}
