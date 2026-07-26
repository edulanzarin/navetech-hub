"use client";

import { useCallback, useState } from "react";

/**
 * Estado de tela que sobrevive à navegação ENTRE as seções de um módulo e é
 * descartado só ao SAIR do módulo (Trocar módulo). É o que os módulos que usam
 * a URL (Fiscal/Contábil/Folha) já ganham de graça — os params viajam entre as
 * seções pelos links da sidebar. O RH usa estado local, então precisa disto para
 * "permanecer carregado": voltar a uma seção já executada mostra o resultado
 * (com o cache do React Query servindo o dado), sem re-clicar.
 *
 * Vive num objeto de módulo (não no React Query, que é resposta de servidor). A
 * chave é `modulo/secao:campo`; `limparEstadoModulo("rh/")` zera o módulo todo.
 */
const store: Record<string, unknown> = {};

export function limparEstadoModulo(prefixo: string): void {
  for (const k of Object.keys(store)) if (k.startsWith(prefixo)) delete store[k];
}

/** Como `useState`, mas o valor persiste no store do módulo (chave estável). */
export function useEstadoModulo<T>(chave: string, inicial: T) {
  const [valor, setValor] = useState<T>(() => (chave in store ? (store[chave] as T) : inicial));

  const set = useCallback(
    (novo: T | ((prev: T) => T)) => {
      setValor((prev) => {
        const v = typeof novo === "function" ? (novo as (p: T) => T)(prev) : novo;
        store[chave] = v;
        return v;
      });
    },
    [chave]
  );

  return [valor, set] as const;
}
