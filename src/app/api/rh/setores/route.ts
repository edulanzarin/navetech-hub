import { query } from "@/lib/db";
import { apiRoute } from "@/lib/api-route";
import { EMPRESAS_RH } from "@/lib/rh";
import type { SetorRh } from "@/lib/rh-tipos";

/**
 * Setores (organograma do Questor) com funcionários ativos nas duas empresas.
 * Serve o filtro do Diretório e o cadastro de Gestores — a mesma lista real,
 * pra não cadastrar gestor de setor que não existe. Chave: (empresa, estab,
 * classiforgan).
 */
export const GET = apiRoute(async () => {
  const rows = await query<SetorRh>(
    `select f.codigoempresa, f.codigoestab, f.classiforgan,
            coalesce(nullif(btrim(o.descrorgan), ''), '(sem setor)') as nome,
            count(*)::int as ativos
       from funcionario f
       left join organograma o
         on o.codigoempresa = f.codigoempresa and o.codigoestab = f.codigoestab
        and o.classiforgan = f.classiforgan
      where f.codigoempresa = any($1::int[])
        and f.datadem is null
      group by f.codigoempresa, f.codigoestab, f.classiforgan, o.descrorgan
      order by f.codigoempresa, ativos desc`,
    [[...EMPRESAS_RH]]
  );
  return rows;
});
