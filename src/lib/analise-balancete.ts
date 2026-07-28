import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import type { BalanceteContabil } from "./balancete-contabil";
import type { AnaliseDeterministica } from "./types";

/**
 * Camada OPCIONAL de IA: redige a prosa do laudo a partir do que o motor
 * determinístico (`analise-motor.ts`) já achou. Não recalcula nem julga regra —
 * só escreve. É o único ponto que gasta API, e roda sob demanda (botão "Gerar
 * laudo escrito"), então o dia a dia da análise é de graça.
 */

const MODELO = process.env.ANALISE_MODELO?.trim() || "claude-sonnet-5";

export class AnaliseError extends Error {}

const brl0 = (v: number) => "R$ " + Math.round(v).toLocaleString("pt-BR");

/** Serializa os achados do motor pro prompt (compacto). */
function prepararAchados(bal: BalanceteContabil, a: AnaliseDeterministica): string {
  const estrutura = a.estrutura.map(
    (g) => `- ${g.nome}: ${brl0(g.saldo)}${g.pctBase != null ? ` (${(g.pctBase * 100).toFixed(1)}% do ativo)` : ""}`
  );
  const t = a.totais;
  const dre = a.dre.map(
    (l) => `- ${l.nome}: ${brl0(l.valor)}${l.pctReceita != null ? ` (${(l.pctReceita * 100).toFixed(1)}% da receita líquida)` : ""}`
  );
  const inds = a.indicadores.map(
    (i) => `- ${i.nome}: ${i.formatado} [${i.faixa}, tendência ${i.tendencia}] — ${i.interpretacao}`
  );
  const incs = a.inconsistencias.map(
    (i) => `- [${i.severidade}] ${i.titulo}: ${i.detalhe}`
  );
  const c = a.cobertura;
  return [
    `EMPRESA: ${bal.empresa.nome}${bal.empresa.cnpj ? ` — CNPJ ${bal.empresa.cnpj}` : ""}`,
    `PERÍODO: ${bal.mesesLabels.join(", ")}`,
    `SAÚDE GERAL (já classificada): ${a.saudeGeral}`,
    `Balancete fecha: ${a.fecha ? "sim" : `NÃO (diferença ${brl0(a.difFechamento)})`}`,
    `Cobertura: ${c.mesesComMovimento}/${c.mesesSolicitados} meses com movimento; 1º mês com dado: ${c.primeiroMesComDado ?? "nenhum"}; saldo antes do período: ${c.temSaldoInicial ? "sim" : "não"}.`,
    ``,
    `ESTRUTURA PATRIMONIAL (saldo no último mês — Ativo = Passivo + PL):`,
    ...estrutura,
    `- Ativo total: ${brl0(t.ativo)} · Passivo exigível: ${brl0(t.passivo)} · PL: ${brl0(t.pl)}`,
    t.resultadoExercicio > 1 || t.resultadoExercicio < -1
      ? `- Obs.: o PL já inclui ${brl0(t.resultadoExercicio)} de resultado do exercício ainda não transportado às contas de PL (pré-apuração).`
      : `- PL sem resultado pendente de transporte.`,
    ``,
    `RESULTADO DO PERÍODO (DRE em fluxo — movimento do intervalo, não saldo acumulado):`,
    ...dre,
    ``,
    `INDICADORES:`,
    ...inds,
    ``,
    `INCONSISTÊNCIAS/ALERTAS (${a.inconsistencias.length}):`,
    ...(incs.length ? incs : ["- nenhuma"]),
  ].join("\n");
}

const SYSTEM = `Você é um contador e controller sênior brasileiro. Recebe um balancete JÁ ANALISADO por um motor determinístico: os grupos, os indicadores (com faixa e tendência), as inconsistências (com severidade) e a cobertura já vêm calculados e classificados. Seu trabalho é ESCREVER o laudo em prosa, para apresentar ao cliente da contabilidade.

Contexto dos números:
- A estrutura patrimonial já vem reconciliada: o PL inclui o resultado do exercício, então Ativo = Passivo exigível + PL. Se houver "resultado do exercício ainda não transportado", é um balancete mensal pré-apuração — normal, não é erro.
- A DRE do período está em FLUXO (movimento do intervalo), não em saldo acumulado do ano. Trate receita/custo/resultado como o desempenho DAQUELE período.

Regras:
- Use SOMENTE os números e classificações fornecidos. NÃO recalcule indicadores nem invente valores — se um dado não veio, não fale dele.
- Priorize as inconsistências de severidade alta (balancete que não fecha, saldos de sinal impossível, PL negativo): explique a implicação prática de cada uma.
- Respeite a cobertura: não leia meses sem movimento como queda; se o histórico for curto, diga e module a confiança.
- Estruture em parágrafos claros, nesta ordem: panorama geral; estrutura patrimonial e liquidez; endividamento; resultado; inconsistências e alertas; recomendações práticas. Pode usar títulos curtos de seção em texto puro.

Estilo: português do Brasil, profissional e direto, sem markdown e sem emojis. Cite números concretos. Devolva apenas o texto do laudo.`;

export interface ResultadoLaudo {
  texto: string;
  meta: { modelo: string; tokensEntrada: number; tokensSaida: number };
}

/** Redige o laudo escrito (prosa) sobre os achados do motor. */
export async function redigirLaudo(
  bal: BalanceteContabil,
  analise: AnaliseDeterministica
): Promise<ResultadoLaudo> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new AnaliseError(
      "Chave da API do Claude não configurada — defina ANTHROPIC_API_KEY no ambiente."
    );
  }

  const client = new Anthropic();
  const achados = prepararAchados(bal, analise);

  let response: Anthropic.Message;
  try {
    response = await client.messages.create({
      model: MODELO,
      max_tokens: 8000,
      system: [{ type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } }],
      output_config: { effort: "medium" },
      messages: [
        {
          role: "user",
          content: `Escreva o laudo do balancete a partir dos achados abaixo.\n\n${achados}`,
        },
      ],
    });
  } catch (err) {
    const msg = err instanceof Error && err.message ? err.message : String(err);
    throw new AnaliseError(`Falha ao chamar o Claude: ${msg}`);
  }

  if (response.stop_reason === "refusal") {
    throw new AnaliseError("O modelo recusou a redação deste conteúdo.");
  }

  const texto = response.content
    .filter((b) => b.type === "text")
    .map((b) => (b.type === "text" ? b.text : ""))
    .join("")
    .trim();
  if (!texto) throw new AnaliseError("Resposta do modelo sem texto.");

  return {
    texto,
    meta: {
      modelo: response.model,
      tokensEntrada:
        response.usage.input_tokens +
        (response.usage.cache_read_input_tokens ?? 0) +
        (response.usage.cache_creation_input_tokens ?? 0),
      tokensSaida: response.usage.output_tokens,
    },
  };
}
