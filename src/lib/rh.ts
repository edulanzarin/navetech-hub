/**
 * Constantes do módulo RH (interno da Navecon). O RH só enxerga as DUAS
 * empresas da própria Navecon — NAVECON e FOUR — e o escopo é FIXO nelas,
 * independente do grupo de empresa da sessão (o grupo padrão do Hub é "Todas
 * menos NAVECON", que esconderia justo a empresa 1). O gate do módulo é ter as
 * seções do RH; o dado sempre se limita a estas empresas.
 */
export const EMPRESAS_RH = [1, 888] as const;
export type EmpresaRh = (typeof EMPRESAS_RH)[number];

const NOME_EMPRESA: Record<number, string> = {
  1: "NAVECON",
  888: "FOUR",
};

export function nomeEmpresaRh(codigo: number): string {
  return NOME_EMPRESA[codigo] ?? `Empresa ${codigo}`;
}

export function ehEmpresaRh(codigo: number): codigo is EmpresaRh {
  return (EMPRESAS_RH as readonly number[]).includes(codigo);
}

/**
 * Empresas a consultar a partir do filtro `?empresa=`. Vazio/ausente = as duas;
 * um código válido = só ela. Nunca deixa escapar de {NAVECON, FOUR}.
 */
export function empresasDoFiltro(empresa: string | null): number[] {
  const cod = Number(empresa);
  return empresa && ehEmpresaRh(cod) ? [cod] : [...EMPRESAS_RH];
}

/** URL base do app, para montar links públicos (formulário de experiência). */
export function appUrl(): string {
  return (process.env.APP_URL ?? "http://localhost:4022").replace(/\/+$/, "");
}
