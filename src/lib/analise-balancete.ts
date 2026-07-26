import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import type { BalanceteContabil } from "./balancete-contabil";
import type { LaudoAnalise } from "./types";

/**
 * Ponte entre o balancete coletado (determinístico) e o laudo escrito pela IA.
 *
 * Divisão de trabalho: o backend NÃO interpreta finanças — ele apenas seleciona
 * e compacta os dados certos (as sintéticas, que carregam o agrupamento que o
 * próprio contador definiu, + as maiores analíticas). O Claude lê os rótulos das
 * contas (`descrconta`) e a hierarquia (`classifconta`), calcula os indicadores
 * e escreve o laudo. Grupos de conta variam de plano pra plano; deixar o modelo
 * ler os nomes é mais robusto que cravar "classe 1 = ativo" no código.
 */

/** Modelo padrão: Sonnet 5 (perto do Opus em análise, a 1/3 do custo). */
const MODELO = process.env.ANALISE_MODELO?.trim() || "claude-sonnet-5";

/** Quantas analíticas (além de TODAS as sintéticas) mandar, por maior saldo. */
const MAX_ANALITICAS = 80;

export class AnaliseError extends Error {}

const real0 = (v: number) => Math.round(v).toLocaleString("pt-BR");

/**
 * Serializa o balancete em texto compacto pro prompt. Manda todas as sintéticas
 * (poucas, e são a espinha dorsal: Ativo Circulante, Passivo, Receita…) com o
 * saldo ao fim de cada mês, mais as maiores analíticas pra dar textura.
 */
export function prepararDados(bal: BalanceteContabil): string {
  const { empresa, mesesLabels, contas } = bal;
  const sinteticas = contas.filter((c) => c.sintetica);
  const analiticas = contas
    .filter((c) => !c.sintetica)
    .sort((a, b) => {
      const sa = Math.abs(a.meses.at(-1)?.saldoFinal ?? 0);
      const sb = Math.abs(b.meses.at(-1)?.saldoFinal ?? 0);
      return sb - sa;
    })
    .slice(0, MAX_ANALITICAS);

  const linha = (c: (typeof contas)[number]) => {
    const saldos = c.meses.map((m) => real0(m.saldoFinal)).join("; ");
    return `${c.classif} | ${c.descricao} (${c.natureza}) | ini ${real0(c.saldoInicial)} | fim/mês: ${saldos}`;
  };

  return [
    `EMPRESA: ${empresa.nome}${empresa.cnpj ? ` — CNPJ ${empresa.cnpj}` : ""}`,
    `PERÍODO (meses): ${mesesLabels.join(", ")}`,
    `Valores em reais. "ini" = saldo antes do 1º mês; "fim/mês" = saldo ao fim de cada mês, na ordem acima. Natureza: (D) devedora, (C) credora.`,
    ``,
    `CONTAS SINTÉTICAS (estrutura do balancete, com rollup):`,
    ...sinteticas.map(linha),
    ``,
    `PRINCIPAIS CONTAS ANALÍTICAS (as ${analiticas.length} de maior saldo):`,
    ...analiticas.map(linha),
  ].join("\n");
}

const SYSTEM = `Você é um contador e controller sênior brasileiro. Recebe o balancete contábil de uma empresa (saldos por conta ao longo de vários meses) e produz uma ANÁLISE COMPLETA E ROBUSTA, no nível de um laudo que será apresentado ao cliente da contabilidade.

Como trabalhar:
- Leia a hierarquia (classifconta) e os nomes das contas (descrconta) para entender o plano: identifique Ativo (circulante e não circulante), Passivo (circulante e não circulante), Patrimônio Líquido, Receitas, Custos e Despesas. Os grupos variam de plano para plano — guie-se pelos rótulos, não por suposições fixas.
- Calcule os indicadores que os dados permitirem: liquidez corrente e geral, endividamento (capital de terceiros/PL), imobilização do PL, margem de contribuição/líquida quando houver contas de resultado, e a EVOLUÇÃO mês a mês (tendências, sazonalidade, saltos bruscos). Sempre cite números concretos do balancete.
- Só afirme o que os dados sustentam. Se um indicador não for calculável com o que veio, diga isso em vez de inventar. Não confunda saldo devedor/credor: contas devedoras (D) aumentam com débito, credoras (C) com crédito.
- Aponte pontos fortes, pontos fracos, alertas (inconsistências, saldos com sinal atípico, contas que cresceram demais, indícios de erro de classificação) e recomendações práticas.

Estilo: português do Brasil, tom profissional e direto, adequado para apresentar ao cliente. Seja específico e quantitativo; evite generalidades vagas. Não use markdown nem emojis nos textos — apenas texto corrido nos campos.`;

/** JSON schema do laudo (structured outputs). Espelha `LaudoAnalise`. */
const SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    resumoExecutivo: {
      type: "string",
      description: "Parágrafo de abertura com o panorama geral e a conclusão principal.",
    },
    saudeGeral: { type: "string", enum: ["forte", "estavel", "atencao", "critica"] },
    indicadores: {
      type: "array",
      description: "Indicadores financeiros calculados, com valor e leitura.",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          nome: { type: "string" },
          valor: { type: "string", description: "O número/índice já formatado (ex.: '1,42' ou 'R$ 1,2 mi')." },
          interpretacao: { type: "string" },
          tendencia: { type: "string", enum: ["melhora", "estavel", "piora"] },
        },
        required: ["nome", "valor", "interpretacao", "tendencia"],
      },
    },
    pontosFortes: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: { titulo: { type: "string" }, detalhe: { type: "string" } },
        required: ["titulo", "detalhe"],
      },
    },
    pontosFracos: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: { titulo: { type: "string" }, detalhe: { type: "string" } },
        required: ["titulo", "detalhe"],
      },
    },
    alertas: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          severidade: { type: "string", enum: ["alta", "media", "baixa"] },
          titulo: { type: "string" },
          detalhe: { type: "string" },
        },
        required: ["severidade", "titulo", "detalhe"],
      },
    },
    recomendacoes: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          titulo: { type: "string" },
          detalhe: { type: "string" },
          prioridade: { type: "string", enum: ["alta", "media", "baixa"] },
        },
        required: ["titulo", "detalhe", "prioridade"],
      },
    },
  },
  required: [
    "resumoExecutivo",
    "saudeGeral",
    "indicadores",
    "pontosFortes",
    "pontosFracos",
    "alertas",
    "recomendacoes",
  ],
} as const;

export interface ResultadoAnalise {
  laudo: LaudoAnalise;
  meta: { modelo: string; tokensEntrada: number; tokensSaida: number };
}

/** Roda a análise: monta o prompt, chama o Claude e devolve o laudo estruturado. */
export async function analisarBalancete(bal: BalanceteContabil): Promise<ResultadoAnalise> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new AnaliseError(
      "Chave da API do Claude não configurada — defina ANTHROPIC_API_KEY no ambiente."
    );
  }
  if (bal.contas.length === 0) {
    throw new AnaliseError("Sem movimento contábil no período para analisar.");
  }

  const client = new Anthropic();
  const dados = prepararDados(bal);

  let response: Anthropic.Message;
  try {
    response = await client.messages.create({
      model: MODELO,
      max_tokens: 12000,
      // Cacheia as instruções fixas (o system é sempre igual entre análises).
      system: [{ type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } }],
      output_config: {
        effort: "medium",
        format: { type: "json_schema", schema: SCHEMA },
      },
      messages: [
        {
          role: "user",
          content: `Analise o balancete abaixo e devolva o laudo no formato pedido.\n\n${dados}`,
        },
      ],
    });
  } catch (err) {
    const msg = err instanceof Error && err.message ? err.message : String(err);
    throw new AnaliseError(`Falha ao chamar o Claude: ${msg}`);
  }

  if (response.stop_reason === "refusal") {
    throw new AnaliseError("O modelo recusou a análise deste conteúdo.");
  }

  const texto = response.content.find((b) => b.type === "text");
  if (!texto || texto.type !== "text") {
    throw new AnaliseError("Resposta do modelo sem conteúdo textual.");
  }

  let laudo: LaudoAnalise;
  try {
    laudo = JSON.parse(texto.text) as LaudoAnalise;
  } catch {
    throw new AnaliseError("Resposta do modelo não veio em JSON válido.");
  }

  return {
    laudo,
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
