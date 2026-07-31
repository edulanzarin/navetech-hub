import { PoolClient } from "pg";
import type {
  ContaProvisao,
  FolhaProvisao,
  ProvisoesResp,
  StatusFechamento,
} from "./types";

/**
 * PROVISÕES — folha calculada × contábil lançado. O Questor calcula a provisão
 * de férias/13º como uma FOLHA própria (`tipocalculo` 70/71), com o resultado em
 * `calculoevento`; ao integrar, ela vira lançamento contábil de origem `FP`
 * contra as contas de provisão. Esta conferência confronta os dois lados e
 * aponta a divergência — sem escrever nada. Ver [[Módulo de folha e eSocial do
 * Questor]] e [[Módulo contábil do Questor]].
 *
 * MÉTODO (heurística — a validar no banco real):
 *  • calculado = Σ dos proventos (evento.tipoevento = 1) das folhas de provisão
 *    (periodocalculo.codigotipocalc ∈ {70,71}) cuja folha fecha no mês.
 *  • lançado = movimento líquido credor (crédito − débito), origem FP, nas contas
 *    cujo nome contém "provis" — o aumento da provisão no contábil.
 * A tela mostra as folhas e as contas que entraram na conta, para conferência.
 */

const TOL = 1; // R$: abaixo disso, calculado ≈ lançado.
const TIPOS_PROVISAO = [70, 71];

export async function montarProvisoes(
  client: PoolClient,
  empresa: number,
  inicio: string,
  fim: string,
  estabs: number[]
): Promise<ProvisoesResp> {
  const temEstab = estabs.length > 0;

  // Nome da empresa (barato; as demais rotas pegam do coletor de balancete).
  const empRow = await client.query<{ nome: string }>(
    `select coalesce(nomeempresa, '') nome from empresa where codigoempresa = $1`,
    [empresa]
  );
  const nome = empRow.rows[0]?.nome ?? "";

  // ── Calculado: folhas de provisão (tipo 70/71) que fecham no mês ──
  // Recorta pelo fim da folha dentro do período. calculoevento não carrega
  // estabelecimento; a filial recorta pelo contrato (funccontrato).
  const estabFolha = temEstab ? " and fc.codigoestab = any($4::int[])" : "";
  const paramsFolha = temEstab ? [empresa, inicio, fim, estabs] : [empresa, inicio, fim];
  const folhasRes = await client.query<{
    tipo: number;
    descricao: string;
    competencia: string;
    total: number;
  }>(
    `select pc.codigotipocalc tipo,
            coalesce(max(tc.descrtipocalc), 'Provisão') descricao,
            coalesce(max(pc.compet::text), '') competencia,
            coalesce(sum(ce.valorevento), 0)::float total
       from periodocalculo pc
       join tipocalculo tc on tc.codigotipocalc = pc.codigotipocalc
       join calculoevento ce
         on ce.codigoempresa = pc.codigoempresa and ce.codigopercalculo = pc.codigopercalculo
       join evento ev on ev.codigoevento = ce.codigoevento and ev.tipoevento = 1
       join funccontrato fc
         on fc.codigoempresa = ce.codigoempresa and fc.codigofunccontr = ce.codigofunccontr
      where pc.codigoempresa = $1
        and pc.codigotipocalc = any(array[${TIPOS_PROVISAO.join(",")}])
        and pc.datafinalfolha between $2 and $3${estabFolha}
      group by pc.codigotipocalc`,
    paramsFolha
  );
  const folhas: FolhaProvisao[] = folhasRes.rows.map((r) => ({
    tipo: r.tipo,
    descricao: r.descricao,
    competencia: r.competencia,
    total: r.total,
  }));
  const calculado = folhas.reduce((s, f) => s + f.total, 0);

  // ── Lançado: origem FP nas contas de provisão, movimento líquido credor ──
  const estabCtb = temEstab ? " and l.codigoestab = any($4::int[])" : "";
  const paramsCtb = temEstab ? [empresa, inicio, fim, estabs] : [empresa, inicio, fim];
  const contasRes = await client.query<{ conta: number; descricao: string; movimento: number }>(
    `select p.contactb conta, p.descrconta descricao,
            coalesce(sum(case when l.contactbcred = p.contactb then l.valorlctoctb else 0 end)
                   - sum(case when l.contactbdeb  = p.contactb then l.valorlctoctb else 0 end), 0)::float movimento
       from lctoctb l
       join planoespec p
         on p.codigoempresa = l.codigoempresa
        and p.contactb in (l.contactbcred, l.contactbdeb)
      where l.codigoempresa = $1 and l.datalctoctb between $2 and $3
        and l.codigooriglctoctb = 'FP' and l.tipolancamento = 'LN'
        and p.descrconta ilike '%provis%'${estabCtb}
      group by p.contactb, p.descrconta
      having abs(coalesce(sum(case when l.contactbcred = p.contactb then l.valorlctoctb else 0 end)
                        - sum(case when l.contactbdeb  = p.contactb then l.valorlctoctb else 0 end), 0)) > 0.005
      order by movimento desc`,
    paramsCtb
  );
  const contas: ContaProvisao[] = contasRes.rows;
  const lancado = contas.reduce((s, c) => s + c.movimento, 0);

  const divergencia = calculado - lancado;
  const status: StatusFechamento =
    folhas.length === 0 && contas.length === 0
      ? "na"
      : Math.abs(divergencia) <= TOL
        ? "ok"
        : "atencao";

  return {
    empresa: { codigo: empresa, nome },
    periodo: { inicio, fim },
    calculado,
    lancado,
    divergencia,
    status,
    folhas,
    contas,
  };
}
