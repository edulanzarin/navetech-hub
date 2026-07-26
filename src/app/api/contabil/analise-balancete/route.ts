import { pool } from "@/lib/db";
import { apiRoute } from "@/lib/api-route";
import { parseFilters, FilterError } from "@/lib/fiscal-filters";
import { getSessao, empresasPermitidas } from "@/lib/sessao";
import { coletarBalanceteContabil } from "@/lib/balancete-contabil";
import { analisarBalancete, AnaliseError } from "@/lib/analise-balancete";
import type { AnaliseBalanceteResp } from "@/lib/types";

/**
 * Análise de Balancete: coleta determinística (saldos por conta/mês do contábil)
 * → laudo escrito pela IA (pontos fortes/fracos, alertas, recomendações). Uma
 * empresa por vez; o período é o do filtro (até 12 meses).
 *
 * O coletor consulta o Questor direto por empresa (sem passar pelo `buildWhere`),
 * então o escopo de empresa do usuário é travado aqui — nunca confiar na empresa
 * vinda do cliente.
 */
export const GET = apiRoute(async (req) => {
  const f = parseFilters(req.nextUrl.searchParams);
  if (f.empresas.length !== 1) {
    throw new FilterError("Selecione uma empresa para a análise");
  }
  const empresa = f.empresas[0];

  const escopo = empresasPermitidas(await getSessao());
  if (escopo !== "todas" && !escopo.includes(empresa)) {
    throw new FilterError("Empresa fora do seu escopo de acesso");
  }

  const client = await pool.connect();
  try {
    const bal = await coletarBalanceteContabil(client, empresa, f.inicio, f.fim, f.estabs);
    let resultado;
    try {
      resultado = await analisarBalancete(bal);
    } catch (err) {
      // Erro da análise (chave ausente, recusa, JSON inválido) tem causa própria:
      // repassa a mensagem real ao usuário em vez do genérico "falha no Questor".
      if (err instanceof AnaliseError) throw new FilterError(err.message);
      throw err;
    }

    return {
      laudo: resultado.laudo,
      empresa: bal.empresa,
      periodo: { inicio: f.inicio, fim: f.fim, meses: bal.mesesLabels },
      meta: resultado.meta,
    } satisfies AnaliseBalanceteResp;
  } finally {
    client.release();
  }
});
