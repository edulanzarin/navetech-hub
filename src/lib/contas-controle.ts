import { PoolClient } from "pg";
import { coletarBalanceteContabil } from "./balancete-contabil";
import type { ContaControle, ContasControleResp, OrigemBucket } from "./types";

/**
 * CONTAS DE CONTROLE — composição do movimento por origem. Uma conta patrimonial
 * (cliente, fornecedor, imposto a recolher) devia ser alimentada e baixada pelos
 * MÓDULOS do Questor (fiscal, folha, financeiro), não a dedo. Este relatório
 * abre o movimento do mês de cada conta por `codigooriglctoctb` e acende o alerta
 * quando há lançamento MANUAL (ajuste) numa conta que deveria conciliar sozinha.
 *
 * Reusa o coletor do balancete (saldo, classif, natureza — código já validado) e
 * acrescenta só a agregação por origem. Ver [[Módulo contábil do Questor]].
 */

const TOL = 0.005;

/** Prefixo hierárquico do classif (casa a classe e as filhas, sem "1.10" em "1.1"). */
const pref = (classif: string, p: string) => classif === p || classif.startsWith(p + ".");

/**
 * Baldes de origem. O código de duas letras de `origemlctoctb` vira um grupo de
 * leitura; o que sobra (e o manual explícito) cai em `manual`/`outros`. Manual é
 * o balde-alerta: CB contabilidade manual, AA ajustes anteriores, XX extemporâneo,
 * IP importação genérica, LA lalur, ZZ zeramento.
 */
function balde(origem: string): OrigemBucket {
  switch (origem) {
    case "FI":
      return "fiscal";
    case "FP":
      return "folha";
    case "FN":
    case "CP":
    case "CR":
    case "CC":
    case "CE":
      return "financeiro";
    case "IM":
      return "patrimonio";
    case "CB":
    case "AA":
    case "XX":
    case "IP":
    case "LA":
    case "ZZ":
      return "manual";
    default:
      return "outros";
  }
}

const bucketsZerados = (): Record<OrigemBucket, number> => ({
  fiscal: 0,
  folha: 0,
  financeiro: 0,
  patrimonio: 0,
  manual: 0,
  outros: 0,
});

/** É conta patrimonial de controle? Classe 1/2, fora de compensação e do PL. */
function ehControle(classif: string): boolean {
  if (pref(classif, "1.4") || pref(classif, "2.9")) return false; // compensação
  if (pref(classif, "2.4") || pref(classif, "2.5") || pref(classif, "2.6")) return false; // PL
  return pref(classif, "1") || pref(classif, "2");
}

export async function montarContasControle(
  client: PoolClient,
  empresa: number,
  inicio: string,
  fim: string,
  estabs: number[]
): Promise<ContasControleResp> {
  const bal = await coletarBalanceteContabil(client, empresa, inicio, fim, estabs);

  // Movimento do período por conta e origem (débito e crédito). Mesmo padrão de
  // agregação que a Conferência usa para o MOV — filtra por empresa + data e só
  // lançamento normal (LN), como o balancete.
  const temEstab = estabs.length > 0;
  const estab = temEstab ? " and codigoestab = any($4::int[])" : "";
  const params = temEstab ? [empresa, inicio, fim, estabs] : [empresa, inicio, fim];
  const mov = await client.query<{ conta: number; origem: string; deb: number; cred: number }>(
    `select conta, origem, sum(deb)::float deb, sum(cred)::float cred from (
        select contactbdeb conta, codigooriglctoctb origem, valorlctoctb deb, 0 cred
          from lctoctb
         where codigoempresa = $1 and datalctoctb between $2 and $3 and tipolancamento = 'LN'
           and contactbdeb is not null${estab}
        union all
        select contactbcred, codigooriglctoctb, 0, valorlctoctb
          from lctoctb
         where codigoempresa = $1 and datalctoctb between $2 and $3 and tipolancamento = 'LN'
           and contactbcred is not null${estab}
      ) t
      group by conta, origem`,
    params
  );

  // Metadados da conta (classif, natureza, saldo final) vêm do coletor validado.
  const meta = new Map(bal.contas.filter((c) => !c.sintetica).map((c) => [c.conta, c]));

  // Acumula o movimento por origem na direção NATURAL da conta (+ aumenta o saldo).
  const porConta = new Map<number, Record<OrigemBucket, number>>();
  for (const r of mov.rows) {
    const c = meta.get(r.conta);
    if (!c || !ehControle(c.classif)) continue;
    let baldes = porConta.get(r.conta);
    if (!baldes) {
      baldes = bucketsZerados();
      porConta.set(r.conta, baldes);
    }
    const natural = c.natureza === "D" ? r.deb - r.cred : r.cred - r.deb;
    baldes[balde(r.origem)] += natural;
  }

  const contas: ContaControle[] = [];
  let contasComManual = 0;
  let valorManual = 0;
  for (const [conta, origens] of porConta) {
    const c = meta.get(conta)!;
    const temManual = Math.abs(origens.manual) > TOL;
    if (temManual) {
      contasComManual += 1;
      valorManual += Math.abs(origens.manual);
    }
    contas.push({
      conta,
      descricao: c.descricao,
      classif: c.classif,
      natureza: c.natureza,
      saldoFinal: c.meses.at(-1)?.saldoFinal ?? 0,
      origens,
      temManual,
    });
  }

  // Manuais primeiro (o que pede olho), depois por magnitude de saldo.
  contas.sort(
    (a, b) => Number(b.temManual) - Number(a.temManual) || Math.abs(b.saldoFinal) - Math.abs(a.saldoFinal)
  );

  return {
    empresa: { codigo: empresa, nome: bal.empresa.nome },
    periodo: { inicio, fim },
    contas,
    resumo: { totalContas: contas.length, contasComManual, valorManual },
  };
}
