import { pool } from "@/lib/db";
import { apiRoute, assertEmpresaVisivel } from "@/lib/api-route";
import { parseFilters, FilterError } from "@/lib/fiscal-filters";
import { montarContasControle } from "@/lib/contas-controle";
import type { ContasControleResp } from "@/lib/types";

/**
 * Contas de Controle: abre o movimento do mês de cada conta patrimonial por
 * origem (fiscal, folha, financeiro, manual) para conciliar a conta contra o
 * módulo que deveria alimentá-la. Custo zero; escopo de empresa travado aqui.
 */
export const GET = apiRoute(async (req) => {
  const f = parseFilters(req.nextUrl.searchParams);
  if (f.empresas.length !== 1) {
    throw new FilterError("Selecione uma empresa para as contas de controle");
  }
  const empresa = f.empresas[0];
  await assertEmpresaVisivel(empresa);

  const client = await pool.connect();
  try {
    return (await montarContasControle(client, empresa, f.inicio, f.fim, f.estabs)) satisfies ContasControleResp;
  } finally {
    client.release();
  }
});
