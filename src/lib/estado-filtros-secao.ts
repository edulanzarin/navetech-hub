/**
 * Memória de FILTRO por seção. Cada seção (Notas, Balancete, Conferência…) tem o
 * seu próprio recorte — empresa, período E o marcador de "já executei" (`ap`) —
 * que persiste enquanto se navega DENTRO do módulo.
 *
 * Regra que isto realiza:
 *  - trocar de seção NÃO leva o filtro da anterior junto (seção nova nasce
 *    limpa, exige Executar);
 *  - voltar a uma seção RESTAURA o que ela tinha (inclusive o resultado já
 *    executado) — não zera.
 *
 * Cache em memória, descartado ao SAIR do módulo (o shell chama
 * `limparFiltrosDoModulo` no unmount, junto do estado de tela em [[estado-secao]]).
 * O módulo é a unidade que persiste: o filtro cai junto com o resto, então
 * reentrar começa limpo em vez de restaurar um recorte de outra visita. Chaveado
 * pelo caminho da seção, único entre módulos, sem colisão Fiscal/Contábil/etc.
 */

const memoria = new Map<string, string>();

/** Guarda a query string (sem o "?") da seção. */
export function lembrarFiltrosSecao(secaoPath: string, query: string): void {
  memoria.set(secaoPath, query);
}

/** Query lembrada da seção, ou undefined se ela nunca foi visitada. */
export function filtrosLembrados(secaoPath: string): string | undefined {
  return memoria.get(secaoPath);
}

/** Zera a memória de filtro de um módulo inteiro (base = "/contabil", "/fiscal"…). */
export function limparFiltrosDoModulo(base: string): void {
  const prefixo = `${base}/`;
  for (const k of memoria.keys()) if (k.startsWith(prefixo)) memoria.delete(k);
}
