import { pool } from "@/lib/db";
import { apiRoute, assertEmpresaVisivel } from "@/lib/api-route";
import { parseFilters, FilterError } from "@/lib/fiscal-filters";
import { montarProvisoes } from "@/lib/provisoes";
import type { ProvisoesResp } from "@/lib/types";

/**
 * Provisões: confronta a provisão que a folha calculou (folhas tipo 70/71) com o
 * que o contábil lançou (origem FP em contas de provisão), apontando a
 * divergência. Só leitura; escopo de empresa travado aqui.
 */
export const GET = apiRoute(async (req) => {
  const f = parseFilters(req.nextUrl.searchParams);
  if (f.empresas.length !== 1) {
    throw new FilterError("Selecione uma empresa para conferir as provisões");
  }
  const empresa = f.empresas[0];
  await assertEmpresaVisivel(empresa);

  const client = await pool.connect();
  try {
    return (await montarProvisoes(client, empresa, f.inicio, f.fim, f.estabs)) satisfies ProvisoesResp;
  } finally {
    client.release();
  }
});
