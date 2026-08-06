/**
 * Constantes do módulo RH (interno da Navecon). O RH só enxerga as empresas da
 * própria Navecon — NAVECON, FOUR e FINAVE — e o escopo é FIXO nelas,
 * independente do grupo de empresa da sessão (o grupo padrão do Hub é "Todas
 * menos NAVECON", que esconderia justo a empresa 1). O gate do módulo é ter as
 * seções do RH; o dado sempre se limita a estas empresas.
 */
export const EMPRESAS_RH = [1, 888, 746] as const;
export type EmpresaRh = (typeof EMPRESAS_RH)[number];

const NOME_EMPRESA: Record<number, string> = {
  1: "NAVECON",
  888: "FOUR",
  746: "FINAVE",
};

export function nomeEmpresaRh(codigo: number): string {
  return NOME_EMPRESA[codigo] ?? `Empresa ${codigo}`;
}

export function ehEmpresaRh(codigo: number): codigo is EmpresaRh {
  return (EMPRESAS_RH as readonly number[]).includes(codigo);
}

/**
 * Empresas a consultar a partir do filtro `?empresa=`. Vazio/ausente = todas as
 * do RH; um código válido = só ela. Nunca deixa escapar de {NAVECON, FOUR, FINAVE}.
 */
export function empresasDoFiltro(empresa: string | null): number[] {
  const cod = Number(empresa);
  return empresa && ehEmpresaRh(cod) ? [cod] : [...EMPRESAS_RH];
}
