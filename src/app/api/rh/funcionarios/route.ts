import { query } from "@/lib/db";
import { apiRoute } from "@/lib/api-route";
import { EMPRESAS_RH } from "@/lib/rh";
import type { FuncionarioDiretorio } from "@/lib/rh-tipos";

/**
 * Diretório: todos os funcionários ATIVOS das empresas do RH. Volume é
 * pequeno (~80), então a rota devolve a lista inteira e a tela filtra por
 * empresa/setor/busca no cliente (instantâneo, e a contagem por empresa sai de
 * graça). Base é a view `funcionario`.
 */
export const GET = apiRoute(async () => {
  const rows = await query<FuncionarioDiretorio>(
    `select f.codigoempresa, f.codigofunccontr as contrato, f.nomefunc as nome,
            nullif(btrim(ca.descrcargo), '') as cargo,
            nullif(btrim(o.descrorgan), '') as setor,
            f.classiforgan,
            to_char(f.dataadm, 'YYYY-MM-DD') as dataadm
       from funcionario f
       left join cargo ca on ca.codigocargo = f.codigocargo
       left join organograma o
         on o.codigoempresa = f.codigoempresa and o.codigoestab = f.codigoestab
        and o.classiforgan = f.classiforgan
      where f.codigoempresa = any($1::int[])
        and f.datadem is null
      order by f.nomefunc`,
    [[...EMPRESAS_RH]]
  );
  return rows;
});
