/**
 * Memória de FILTRO por seção. Cada seção (Notas, Balancete, Conferência…) tem o
 * seu próprio recorte — empresa, período E o marcador de "já executei" (`ap`) —
 * que persiste enquanto se navega pelo app.
 *
 * Regra que isto realiza:
 *  - trocar de seção NÃO leva o filtro da anterior junto (seção nova nasce
 *    limpa, exige Executar);
 *  - voltar a uma seção RESTAURA o que ela tinha (inclusive o resultado já
 *    executado) — não zera.
 *
 * É um cache em memória (vive na sessão do SPA; um reload completo recomeça, mas
 * a URL corrente já carrega a seção ativa). Chaveado pelo caminho da seção, que
 * é único entre módulos, então não há colisão entre Fiscal/Contábil/etc.
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
