import { pool } from "@/lib/db";
import { apiRoute, assertEmpresaVisivel } from "@/lib/api-route";
import { FilterError } from "@/lib/fiscal-filters";
import { aprenderContabilizacao } from "@/lib/aprender-contabilizacao";

/**
 * Reaprende, dos últimos 12 meses, quais CFOPs da empresa contabilizam, e
 * regrava o cadastro (os overrides manuais ficam intactos — moram em conf_regra).
 * POST = edição, então exige permissão de edição no módulo.
 */
export const POST = apiRoute(async (req) => {
  const empresa = Number(req.nextUrl.searchParams.get("empresa"));
  if (!Number.isInteger(empresa)) throw new FilterError("Selecione uma empresa");
  await assertEmpresaVisivel(empresa);
  const client = await pool.connect();
  try {
    const cfops = await aprenderContabilizacao(client, empresa);
    return { ok: true, cfops };
  } finally {
    client.release();
  }
});
