import { PoolClient } from "pg";
import { coletarBalanceteContabil, type BalanceteContabil } from "./balancete-contabil";
import { analisarMotor } from "./analise-motor";
import { conferir } from "./conferencia-servico";
import type {
  ChecagemFechamento,
  FechamentoResp,
  ItemFechamento,
  StatusFechamento,
} from "./types";

/**
 * FECHAMENTO MENSAL — o semáforo "posso fechar o mês?". Não computa nada novo:
 * orquestra os motores JÁ VALIDADOS do módulo (o motor determinístico do
 * balancete e a conferência fiscal de notas) e traduz cada resultado num
 * veredito verde/amarelo/vermelho. É a cola que vira as telas soltas num fluxo
 * de fechamento — por isso ele reusa, não reimplementa. Cada checagem aponta a
 * tela onde a pendência se resolve.
 */

const brl0 = (v: number) => "R$ " + Math.round(v).toLocaleString("pt-BR");

/** Severidade ordenável: erro trava, atenção alerta, ok libera, na não conta. */
const peso: Record<StatusFechamento, number> = { erro: 3, atencao: 2, ok: 1, na: 0 };

/** Pior status entre vários (ignora `na`, que é ausência de checagem). */
function pior(...ss: StatusFechamento[]): StatusFechamento {
  const reais = ss.filter((s) => s !== "na");
  if (!reais.length) return "na";
  return reais.reduce((a, b) => (peso[b] > peso[a] ? b : a));
}

/**
 * Checagem do balancete de verificação. Reusa `analisarMotor`: se o balancete
 * não fecha (partida sem contrapartida) ou a saúde é crítica, trava; alta/média
 * inconsistência é atenção. As pendências são as próprias inconsistências do
 * motor, já ordenadas por severidade.
 */
function checarBalancete(bal: BalanceteContabil): ChecagemFechamento {
  const base = { id: "balancete", titulo: "Balancete de verificação", link: "/contabil/balancete-contabil" };
  if (bal.contas.length === 0) {
    return { ...base, status: "na", resumo: "Sem movimento contábil no período.", itens: [] };
  }

  const a = analisarMotor(bal);
  const status: StatusFechamento = !a.fecha || a.saudeGeral === "critica"
    ? "erro"
    : a.saudeGeral === "forte"
      ? "ok"
      : "atencao";

  const sevItem = (s: "alta" | "media" | "baixa"): StatusFechamento =>
    s === "alta" ? "erro" : s === "media" ? "atencao" : "ok";
  const itens: ItemFechamento[] = a.inconsistencias
    .filter((i) => i.severidade !== "baixa")
    .slice(0, 8)
    .map((i) => ({ rotulo: i.titulo, valor: i.valor, severidade: sevItem(i.severidade) }));

  const resumo = !a.fecha
    ? `Não fecha: diferença de ${brl0(Math.abs(a.difFechamento))} entre débitos e créditos.`
    : status === "ok"
      ? "Fecha e sem inconsistências relevantes."
      : `Fecha, mas há ${itens.length} ponto(s) a conferir.`;

  return { ...base, status, resumo, itens };
}

/**
 * Checagem de uma via de notas (entrada ou saída). Reusa o `resumo` da
 * Conferência Fiscal, que já classifica cada nota. Nota não contabilizada ou em
 * conta divergente trava; duplicidade é atenção. O filtro de situação não afeta
 * o `resumo` (ele é apurado sobre todas as notas), então passa "todas".
 */
async function checarConferencia(
  client: PoolClient,
  empresa: number,
  inicio: string,
  fim: string,
  estabs: number[],
  tipo: "ent" | "sai"
): Promise<ChecagemFechamento> {
  const base = {
    id: `conferencia-${tipo}`,
    titulo: tipo === "ent" ? "Notas de entrada" : "Notas de saída",
    link: "/contabil/conferencia",
  };
  const { resumo: r } = await conferir(client, empresa, inicio, fim, estabs, {
    tipo,
    situacao: "todas",
    busca: "",
    especies: [],
    cfops: [],
    ordem: "valor_desc",
    pagina: 1,
  });

  if (r.total === 0) {
    return { ...base, status: "na", resumo: "Sem notas no período.", itens: [] };
  }

  const itens: ItemFechamento[] = [];
  if (r.pendentes > 0)
    itens.push({ rotulo: `${r.pendentes} nota(s) não contabilizada(s)`, valor: r.valorPendente, severidade: "erro" });
  if (r.divergentes > 0)
    itens.push({ rotulo: `${r.divergentes} nota(s) em conta divergente`, valor: r.valorDivergente, severidade: "erro" });
  if (r.duplicadas > 0)
    itens.push({ rotulo: `${r.duplicadas} nota(s) contabilizada(s) em duplicidade`, valor: r.valorDuplicado, severidade: "atencao" });

  const status: StatusFechamento = r.pendentes > 0 || r.divergentes > 0
    ? "erro"
    : r.duplicadas > 0
      ? "atencao"
      : "ok";
  const resumo = status === "ok"
    ? `${r.total} nota(s) conferida(s), tudo lançado.`
    : `${r.total} nota(s) conferida(s), ${itens.length} tipo(s) de pendência.`;

  return { ...base, status, resumo, itens };
}

/** Monta o fechamento do mês: roda as checagens e devolve o veredito geral. */
export async function montarFechamento(
  client: PoolClient,
  empresa: number,
  inicio: string,
  fim: string,
  estabs: number[]
): Promise<FechamentoResp> {
  const [bal, ent, sai] = await Promise.all([
    coletarBalanceteContabil(client, empresa, inicio, fim, estabs),
    checarConferencia(client, empresa, inicio, fim, estabs, "ent"),
    checarConferencia(client, empresa, inicio, fim, estabs, "sai"),
  ]);
  const checagens = [checarBalancete(bal), ent, sai];

  return {
    empresa: { codigo: empresa, nome: bal.empresa.nome },
    periodo: { inicio, fim },
    status: pior(...checagens.map((c) => c.status)),
    checagens,
  };
}
