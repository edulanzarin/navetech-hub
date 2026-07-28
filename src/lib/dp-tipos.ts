/**
 * Tipos da Produtividade do DP — compartilhados entre a lib server-only
 * (`dp-produtividade`) e o cliente (hooks/telas). Vivem fora da lib de queries
 * porque a lib importa `db`/`server-only`; o tipo é apagado no build, mas manter
 * o contrato num arquivo neutro evita puxar código de servidor pro bundle.
 *
 * Tudo aqui é "trabalho do DP no período", medido pela auditoria embutida do
 * Questor (`codigousuario` + `datahoralcto`) — ver [[Logs e auditoria no Questor]].
 */

/** Os quatro tipos de trabalho rastreados, na ordem em que aparecem nas abas. */
export type DpTipo = "avisos" | "rescisoes" | "admissoes" | "ferias";

export const DP_TIPOS: { id: DpTipo; rotulo: string }[] = [
  { id: "avisos", rotulo: "Avisos prévios" },
  { id: "rescisoes", rotulo: "Rescisões" },
  { id: "admissoes", rotulo: "Admissões" },
  { id: "ferias", rotulo: "Férias" },
];

/** Uma linha do ranking: um usuário do Questor e quanto ele fez de cada tipo. */
export interface DpColaborador {
  codigo: number; // codigousuario
  nome: string;
  /** É o usuário 0 (ADMINISTRADOR / rotinas automáticas). */
  auto: boolean;
  /** Conta baixada no Questor (databaixausuario preenchida). */
  inativo: boolean;
  avisos: number;
  rescisoes: number;
  admissoes: number;
  ferias: number;
  total: number;
}

interface DpContagem {
  avisos: number;
  rescisoes: number;
  admissoes: number;
  ferias: number;
  total: number;
}

/** Cabeçalho do dashboard: ranking + totais do período (e do anterior, p/ delta). */
export interface DpResumo {
  ranking: DpColaborador[];
  totais: DpContagem;
  anterior: DpContagem;
  /** Colaboradores humanos (codigousuario ≠ 0) com ao menos um trabalho no período. */
  colaboradores: number;
}

/** Status do S-2200 (admissão) no eSocial, derivado da última transação do contrato. */
export type EsocialStatus = "ok" | "pendente" | "nao_enviado";

/**
 * Uma linha de detalhe. Campos comuns sempre vêm; os específicos do tipo são
 * opcionais e só a aba correspondente os exibe — evita quatro tipos quase iguais.
 */
export interface DpLinha {
  codigoempresa: number;
  empresa: string;
  contrato: number;
  funcionario: string;
  usuario: string;
  codigousuario: number;
  /** Quando o trabalho foi lançado/calculado (datahoralcto), "YYYY-MM-DDTHH:MM:SS". */
  quando: string;
  // avisos / rescisões
  causa?: string | null;
  dataAviso?: string | null;
  dataResc?: string | null;
  // admissões
  dataAdm?: string | null;
  origem?: string | null;
  esocial?: EsocialStatus;
  // férias
  inicioFerias?: string | null;
  fimFerias?: string | null;
  periodoAquisitivo?: string | null;
  dataPgto?: string | null;
}
