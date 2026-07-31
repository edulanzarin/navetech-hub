import { pool } from "@/lib/db";
import { apiRoute, assertEmpresaVisivel } from "@/lib/api-route";
import { parseFilters, FilterError } from "@/lib/fiscal-filters";
import { montarFechamento } from "@/lib/fechamento";
import type { FechamentoResp } from "@/lib/types";

/**
 * Fechamento mensal: o semáforo "posso fechar o mês?". Orquestra os motores já
 * validados do módulo (balancete + conferência) por empresa e período; custo
 * zero (nenhuma IA). Escopo de empresa travado aqui, como as demais rotas que
 * consultam o Questor direto.
 */
export const GET = apiRoute(async (req) => {
  const f = parseFilters(req.nextUrl.searchParams);
  if (f.empresas.length !== 1) {
    throw new FilterError("Selecione uma empresa para o fechamento");
  }
  const empresa = f.empresas[0];
  await assertEmpresaVisivel(empresa);

  const client = await pool.connect();
  try {
    return (await montarFechamento(client, empresa, f.inicio, f.fim, f.estabs)) satisfies FechamentoResp;
  } finally {
    client.release();
  }
});
