import type { BalanceteContabil, ContaBalancete } from "./balancete-contabil";
import { validarBalancete } from "./validacao-balancete";
import type {
  AnaliseDeterministica,
  GrupoBalancete,
  IndicadorCalc,
  Inconsistencia,
} from "./types";

/**
 * MOTOR determinístico da Análise de Balancete — o cérebro. Sem IA: aplica as
 * regras contábeis, classifica os grupos (via `classifconta`, que no Questor é
 * padrão), calcula os indicadores e a evolução mês a mês. Roda no Executar, de
 * graça. A IA só entra depois, opcional, pra redigir a prosa do laudo em cima
 * do que ISTO já achou.
 *
 * Classificação por `classifconta` (estrutura padrão do plano Questor):
 *   1     Ativo        1.1 Circulante · 1.2/1.3 Não circulante
 *   2     Passivo/PL   2.1 Circulante · 2.2/2.3 Não circulante · 2.4/2.5/2.6 PL
 *   4     Receitas     5/6 Custos e despesas
 * Regras olham o `natursaldo` de CADA conta (há redutoras no meio dos grupos).
 */

const TOL = 1;

/** Prefixo hierárquico: casa a classe e suas filhas, sem casar "1.10" com "1.1". */
const pref = (classif: string, p: string) => classif === p || classif.startsWith(p + ".");

interface DefGrupo {
  chave: string;
  nome: string;
  casa: (classif: string) => boolean;
  /** Sinal natural: +1 devedora (ativo/despesa), -1 credora (passivo/PL/receita). */
  sinal: 1 | -1;
  base: "ativo" | "passivoPl" | null;
}

const GRUPOS: DefGrupo[] = [
  { chave: "ativoCirc", nome: "Ativo Circulante", casa: (c) => pref(c, "1.1"), sinal: 1, base: "ativo" },
  { chave: "ativoNaoCirc", nome: "Ativo Não Circulante", casa: (c) => pref(c, "1.2") || pref(c, "1.3"), sinal: 1, base: "ativo" },
  { chave: "passivoCirc", nome: "Passivo Circulante", casa: (c) => pref(c, "2.1"), sinal: -1, base: "passivoPl" },
  { chave: "passivoNaoCirc", nome: "Passivo Não Circulante", casa: (c) => pref(c, "2.2") || pref(c, "2.3"), sinal: -1, base: "passivoPl" },
  { chave: "pl", nome: "Patrimônio Líquido", casa: (c) => pref(c, "2.4") || pref(c, "2.5") || pref(c, "2.6"), sinal: -1, base: "passivoPl" },
  { chave: "receita", nome: "Receitas", casa: (c) => pref(c, "4"), sinal: -1, base: null },
  { chave: "custoDespesa", nome: "Custos e Despesas", casa: (c) => pref(c, "5") || pref(c, "6"), sinal: 1, base: null },
];

const idx = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const brl0 = (v: number) => "R$ " + Math.round(v).toLocaleString("pt-BR");
const pct1 = (v: number) => (v * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 }) + "%";

/** Soma, por mês, o saldo (deb−cred) das analíticas do grupo → magnitude natural. */
function serieGrupo(leaves: ContaBalancete[], def: DefGrupo, nMeses: number): number[] {
  const serie = new Array(nMeses).fill(0);
  for (const c of leaves) {
    if (!def.casa(c.classif)) continue;
    for (let i = 0; i < nMeses; i++) serie[i] += c.meses[i]?.saldoFinal ?? 0;
  }
  return serie.map((v) => def.sinal * v);
}

/** Tendência: compara o último ponto com o primeiro não-nulo da série. */
function tendencia(serie: (number | null)[], maiorMelhor: boolean): IndicadorCalc["tendencia"] {
  const pts = serie.filter((v): v is number => v != null && isFinite(v));
  if (pts.length < 2) return "indef";
  const ini = pts[0];
  const fim = pts[pts.length - 1];
  if (!isFinite(ini) || Math.abs(ini) < 1e-9) return "indef";
  const vari = (fim - ini) / Math.abs(ini);
  if (Math.abs(vari) < 0.05) return "estavel";
  const subiu = vari > 0;
  return subiu === maiorMelhor ? "melhora" : "piora";
}

export function analisarMotor(bal: BalanceteContabil): AnaliseDeterministica {
  const nMeses = bal.mesesLabels.length;
  const leaves = bal.contas.filter((c) => !c.sintetica);
  const val = validarBalancete(bal);

  // ── Grupos (magnitude por mês) ──
  const serieDe = new Map<string, number[]>();
  for (const def of GRUPOS) serieDe.set(def.chave, serieGrupo(leaves, def, nMeses));
  const ultimo = (chave: string) => serieDe.get(chave)!.at(-1) ?? 0;

  const ativoTotalSerie = somaSeries(serieDe.get("ativoCirc")!, serieDe.get("ativoNaoCirc")!);
  const passivoPlSerie = somaSeries(
    serieDe.get("passivoCirc")!,
    serieDe.get("passivoNaoCirc")!,
    serieDe.get("pl")!
  );

  const grupos: GrupoBalancete[] = GRUPOS.map((def) => {
    const serie = serieDe.get(def.chave)!;
    const saldoFinal = serie.at(-1) ?? 0;
    const baseFinal =
      def.base === "ativo" ? ativoTotalSerie.at(-1)! : def.base === "passivoPl" ? passivoPlSerie.at(-1)! : null;
    return {
      chave: def.chave,
      nome: def.nome,
      saldoFinal,
      pctBase: baseFinal && Math.abs(baseFinal) > TOL ? saldoFinal / baseFinal : null,
      serie,
    };
  });

  // ── Indicadores ──
  const razaoSerie = (a: number[], b: number[]) =>
    a.map((v, i) => (Math.abs(b[i]) > TOL ? v / b[i] : null));
  const AC = serieDe.get("ativoCirc")!;
  const ANC = serieDe.get("ativoNaoCirc")!;
  const PC = serieDe.get("passivoCirc")!;
  const PNC = serieDe.get("passivoNaoCirc")!;
  const PL = serieDe.get("pl")!;
  const REC = serieDe.get("receita")!;
  const DESP = serieDe.get("custoDespesa")!;
  const terceiros = somaSeries(PC, PNC);
  const resultado = REC.map((v, i) => v - DESP[i]);

  const faixaPor = (v: number | null, bom: (x: number) => boolean, ruim: (x: number) => boolean): IndicadorCalc["faixa"] =>
    v == null ? "neutro" : bom(v) ? "bom" : ruim(v) ? "ruim" : "atencao";

  const indicadores: IndicadorCalc[] = [];
  const addInd = (
    chave: string, nome: string, serie: (number | null)[], unidade: IndicadorCalc["unidade"],
    maiorMelhor: boolean, faixaFn: (v: number) => IndicadorCalc["faixa"], interp: (v: number | null) => string
  ) => {
    const valor = serie.at(-1) ?? null;
    const fmt = valor == null ? "—" : unidade === "pct" ? pct1(valor) : unidade === "reais" ? brl0(valor) : idx.format(valor);
    indicadores.push({
      chave, nome, valor, formatado: fmt, unidade,
      faixa: valor == null ? "neutro" : faixaFn(valor),
      interpretacao: interp(valor), tendencia: tendencia(serie, maiorMelhor), serie,
    });
  };

  addInd("liquidezCorrente", "Liquidez corrente", razaoSerie(AC, PC), "indice", true,
    (v) => faixaPor(v, (x) => x >= 1.3, (x) => x < 1)!,
    (v) => v == null ? "Sem passivo circulante no período." : v >= 1.3 ? "Folga para honrar o curto prazo." : v >= 1 ? "Cobre o curto prazo, com pouca folga." : "Ativo circulante não cobre o passivo circulante.");

  addInd("capitalGiro", "Capital de giro (CCL)", AC.map((v, i) => v - PC[i]), "reais", true,
    (v) => (v >= 0 ? "bom" : "ruim"),
    (v) => v == null ? "—" : v >= 0 ? "Ativo circulante maior que o passivo circulante." : "Passivo circulante maior que o ativo circulante.");

  addInd("endividamentoAtivo", "Capital de terceiros / Ativo", razaoSerie(terceiros, ativoTotalSerie), "pct", false,
    (v) => faixaPor(v, (x) => x <= 0.5, (x) => x > 0.7)!,
    (v) => v == null ? "—" : `${pct1(v)} do ativo é financiado por terceiros.`);

  addInd("endividamentoPl", "Endividamento sobre o PL", razaoSerie(terceiros, PL), "indice", false,
    (v) => faixaPor(v, (x) => x <= 1, (x) => x > 2)!,
    (v) => v == null ? "Sem PL positivo no período." : `Dívida com terceiros equivale a ${idx.format(v)}× o patrimônio líquido.`);

  addInd("composicaoEndiv", "Composição do endividamento (curto prazo)", razaoSerie(PC, terceiros), "pct", false,
    (v) => faixaPor(v, (x) => x <= 0.5, (x) => x > 0.75)!,
    (v) => v == null ? "—" : `${pct1(v)} da dívida vence no curto prazo.`);

  addInd("imobilizacaoPl", "Imobilização do PL", razaoSerie(ANC, PL), "pct", false,
    (v) => faixaPor(v, (x) => x <= 0.5, (x) => x > 1)!,
    (v) => v == null ? "Sem PL positivo no período." : `${pct1(v)} do PL está no ativo não circulante.`);

  addInd("margemLiquida", "Margem do resultado", razaoSerie(resultado, REC), "pct", true,
    (v) => (v == null ? "neutro" : v > 0.02 ? "bom" : v >= 0 ? "atencao" : "ruim"),
    (v) => v == null ? "Sem receita no período." : v >= 0 ? `Resultado positivo: ${pct1(v)} da receita.` : `Resultado negativo: ${pct1(v)} da receita.`);

  addInd("resultado", "Resultado do período", resultado, "reais", true,
    (v) => (v == null ? "neutro" : v > 0 ? "bom" : v < 0 ? "ruim" : "atencao"),
    (v) => v == null ? "—" : v >= 0 ? "Receitas superaram custos e despesas." : "Custos e despesas superaram as receitas.");

  // ── Inconsistências (regras) ──
  const inc: Inconsistencia[] = [];

  if (!val.fecha) {
    inc.push({
      severidade: "alta", tipo: "nao_fecha", titulo: "Balancete não fecha",
      detalhe: `Diferença de ${brl0(Math.abs(val.difFechamento))} entre débitos e créditos — há erro de dado (partida sem contrapartida). Revise antes de confiar nos números.`,
      valor: val.difFechamento,
    });
  }

  const plFinal = ultimo("pl");
  if (plFinal < -TOL) {
    inc.push({
      severidade: "alta", tipo: "pl_negativo", titulo: "Patrimônio líquido negativo",
      detalhe: `O PL está negativo em ${brl0(Math.abs(plFinal))} (passivo a descoberto): as dívidas superam os bens e direitos.`,
      valor: plFinal,
    });
  }

  // Sinal atípico (devedora credora / credora devedora) — regra dura, vem da validação.
  const MAX_SINAL = 25;
  for (const a of val.anomalias.slice(0, MAX_SINAL)) {
    inc.push({
      severidade: "alta", tipo: "sinal_atipico",
      titulo: `Saldo de sinal atípico · ${a.conta} ${a.descricao}`,
      detalhe: a.natureza === "D"
        ? `Conta devedora com saldo credor de ${brl0(Math.abs(a.saldoFinal))} — em geral impossível (ex.: caixa/estoque negativo). Revise.`
        : `Conta credora com saldo devedor de ${brl0(Math.abs(a.saldoFinal))} — ex.: fornecedor devedor (pagou a maior) ou lançamento errado.`,
      conta: a.conta, valor: a.saldoFinal,
    });
  }
  if (val.anomalias.length > MAX_SINAL) {
    inc.push({
      severidade: "media", tipo: "sinal_atipico_resto",
      titulo: `+ ${val.anomalias.length - MAX_SINAL} contas com saldo de sinal atípico`,
      detalhe: "Listadas as de maior valor acima; as demais seguem o mesmo tipo de violação.",
    });
  }

  // Inversão de natureza DENTRO do período (o saldo natural trocou de sinal).
  const MAX_INV = 15;
  let invCount = 0;
  for (const c of leaves) {
    const nat = c.meses.map((m) => (c.natureza === "C" ? -m.saldoFinal : m.saldoFinal));
    const temPos = nat.some((v) => v > TOL);
    const temNeg = nat.some((v) => v < -TOL);
    if (temPos && temNeg) {
      invCount++;
      if (invCount <= MAX_INV) {
        inc.push({
          severidade: "media", tipo: "inversao_periodo",
          titulo: `Saldo inverteu de natureza no período · ${c.conta} ${c.descricao}`,
          detalhe: "O saldo passou de normal a atípico (ou vice-versa) ao longo dos meses — confira os lançamentos do intervalo.",
          conta: c.conta,
        });
      }
    }
  }

  // Variação abrupta de GRUPO entre meses consecutivos (> 60% e > R$ 50 mil).
  for (const def of GRUPOS) {
    const s = serieDe.get(def.chave)!;
    for (let i = 1; i < s.length; i++) {
      const ant = s[i - 1];
      const at = s[i];
      const dif = at - ant;
      if (Math.abs(ant) > TOL && Math.abs(dif) > 50000 && Math.abs(dif) / Math.abs(ant) > 0.6) {
        inc.push({
          severidade: "baixa", tipo: "variacao_abrupta",
          titulo: `Salto em ${def.nome} · ${bal.mesesLabels[i - 1]} → ${bal.mesesLabels[i]}`,
          detalhe: `Variação de ${brl0(dif)} (${pct1(dif / Math.abs(ant))}). Vale conferir o que causou.`,
          valor: dif,
        });
        break; // um alerta por grupo basta
      }
    }
  }

  inc.sort((a, b) => sev(b.severidade) - sev(a.severidade));

  // ── Saúde geral (regra determinística) ──
  const temAlta = inc.some((i) => i.severidade === "alta");
  const liq = indicadores.find((i) => i.chave === "liquidezCorrente")?.valor;
  const endivAtivo = indicadores.find((i) => i.chave === "endividamentoAtivo")?.valor;
  let saudeGeral: AnaliseDeterministica["saudeGeral"];
  if (!val.fecha || plFinal < -TOL) saudeGeral = "critica";
  else if (temAlta || (liq != null && liq < 1) || (endivAtivo != null && endivAtivo > 0.7)) saudeGeral = "atencao";
  else if (inc.some((i) => i.severidade === "media")) saudeGeral = "estavel";
  else saudeGeral = "forte";

  return {
    saudeGeral,
    fecha: val.fecha,
    difFechamento: val.difFechamento,
    cobertura: val.cobertura,
    grupos,
    indicadores,
    inconsistencias: inc,
    meses: bal.mesesLabels,
  };
}

function somaSeries(...series: number[][]): number[] {
  const n = series[0]?.length ?? 0;
  const out = new Array(n).fill(0);
  for (const s of series) for (let i = 0; i < n; i++) out[i] += s[i] ?? 0;
  return out;
}

const sev = (s: Inconsistencia["severidade"]) => (s === "alta" ? 3 : s === "media" ? 2 : 1);
