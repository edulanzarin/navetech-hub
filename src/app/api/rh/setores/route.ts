import { query } from "@/lib/db";
import { apiRoute } from "@/lib/api-route";
import { EMPRESAS_RH } from "@/lib/rh";
import type { SetorRh } from "@/lib/rh-tipos";

/**
 * Departamentos (classiforgan) com funcionários ativos, UNINDO as empresas do RH
 * (NAVECON, FOUR e FINAVE) — mesma Navecon, mesmos departamentos. Um por
 * classiforgan, com o nome do setor mais populado como rótulo e a soma dos ativos.
 * Serve o cadastro de Gestores (um gestor por departamento, não por empresa).
 */
export const GET = apiRoute(async () => {
  const rows = await query<SetorRh>(
    `select classiforgan,
            (array_agg(nome order by ativos desc, nome))[1] as nome,
            sum(ativos)::int as ativos
       from (
         select f.classiforgan,
                coalesce(nullif(btrim(o.descrorgan), ''), '(sem setor)') as nome,
                count(*)::int as ativos
           from funcionario f
           left join organograma o
             on o.codigoempresa = f.codigoempresa and o.codigoestab = f.codigoestab
            and o.classiforgan = f.classiforgan
          where f.codigoempresa = any($1::int[]) and f.datadem is null
          group by f.codigoempresa, f.classiforgan, o.descrorgan
       ) t
      group by classiforgan
      order by ativos desc`,
    [[...EMPRESAS_RH]]
  );
  return rows;
});
