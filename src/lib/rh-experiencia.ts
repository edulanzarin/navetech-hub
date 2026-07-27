/**
 * Vocabulário PURO do contrato de EXPERIÊNCIA (sem servidor), compartilhado
 * entre o painel e o job/servidor. A consulta ao Questor, a config e o e-mail
 * moram no lado servidor (rh-experiencia-dados); o CONTEÚDO do formulário agora
 * é montado no builder (formularios) — não há mais critérios fixos aqui.
 *
 * Experiência CLT: 45 + 45 dias (o Questor traz `diaprorrogcontrexp = 45`).
 * Dois marcos de avaliação: 45 dias (decidir prorrogar) e 90 (efetivar/desligar).
 */

export const MARCOS = [45, 90] as const;
export type Marco = (typeof MARCOS)[number];

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
