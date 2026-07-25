/**
 * Regras e vocabulário do contrato de EXPERIÊNCIA — parte PURA (sem servidor),
 * compartilhada entre o painel, o formulário público (client) e o job/servidor.
 * A consulta ao Questor e o e-mail moram no lado servidor (rh-experiencia-dados).
 *
 * Experiência CLT: 45 + 45 dias (o Questor traz `diaprorrogcontrexp = 45`).
 * Dois marcos de avaliação: 45 dias (decidir prorrogar) e 90 (efetivar/desligar).
 */

export const MARCOS = [45, 90] as const;
export type Marco = (typeof MARCOS)[number];

/** Lembretes: dias ANTES do vencimento em que o e-mail dispara. 0 = atraso. */
export const LEMBRETES_DIAS = [15, 10, 5, 1] as const;

/** Critérios avaliados no formulário. Chave estável (vai no jsonb) + rótulo. */
export const CRITERIOS_EXPERIENCIA = [
  { chave: "assiduidade", rotulo: "Assiduidade e pontualidade" },
  { chave: "produtividade", rotulo: "Produtividade e ritmo de trabalho" },
  { chave: "qualidade", rotulo: "Qualidade e capricho no trabalho" },
  { chave: "relacionamento", rotulo: "Relacionamento e trabalho em equipe" },
  { chave: "adaptacao", rotulo: "Adaptação à função e à cultura" },
  { chave: "iniciativa", rotulo: "Iniciativa e proatividade" },
] as const;

export type CriterioChave = (typeof CRITERIOS_EXPERIENCIA)[number]["chave"];

/** Escala de avaliação de cada critério (índice 0..3 guardado no jsonb). */
export const ESCALA = ["Insatisfatório", "Regular", "Bom", "Excelente"] as const;

export interface Recomendacao {
  valor: "prorrogar" | "nao_prorrogar" | "efetivar" | "desligar";
  rotulo: string;
}

/** Opções de recomendação dependem do marco (45 decide prorrogação; 90 efetiva). */
export function recomendacoesDoMarco(marco: Marco): Recomendacao[] {
  return marco === 45
    ? [
        { valor: "prorrogar", rotulo: "Prorrogar por mais 45 dias" },
        { valor: "nao_prorrogar", rotulo: "Não prorrogar — desligar ao fim do período" },
      ]
    : [
        { valor: "efetivar", rotulo: "Efetivar (contrato por prazo indeterminado)" },
        { valor: "desligar", rotulo: "Desligar ao fim do contrato de experiência" },
      ];
}

export function rotuloRecomendacao(valor: string): string {
  const todas = [...recomendacoesDoMarco(45), ...recomendacoesDoMarco(90)];
  return todas.find((r) => r.valor === valor)?.rotulo ?? valor;
}

export type StatusExperiencia = "pendente" | "enviado" | "respondido" | "atraso";

export const STATUS_ROTULO: Record<StatusExperiencia, string> = {
  pendente: "Aguardando disparo",
  enviado: "Aguardando resposta",
  respondido: "Respondido",
  atraso: "Em atraso",
};

/** Rótulo curto do marco para exibição. */
export function rotuloMarco(marco: Marco): string {
  return marco === 45 ? "45 dias" : "90 dias";
}

/** Estrutura das respostas gravadas no jsonb `respostas`. */
export interface RespostasExperiencia {
  /** chave do critério -> índice na ESCALA (0..3) */
  criterios: Partial<Record<CriterioChave, number>>;
}
