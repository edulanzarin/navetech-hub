/**
 * CLIMA (avaliação anônima da empresa) — parte PURA (sem servidor). Enums e DTOs
 * compartilhados entre o formulário público (client), a gestão (client) e o
 * serviço (server). eNPS (0..10) + notas por tema (1..5) + comentário.
 */

export interface TemaClima {
  id: string;
  rotulo: string;
}

/** Escala das notas por tema (1..5). Índice 0 = nota 1. */
export const ESCALA_TEMA = ["Ruim", "Fraco", "Regular", "Bom", "Ótimo"] as const;
export const NOTA_TEMA_MIN = 1;
export const NOTA_TEMA_MAX = 5;

/** Abaixo disto, o recorte por setor NÃO é exibido (evita deanonimizar time pequeno). */
export const MIN_RESPOSTAS_RECORTE = 4;

export type StatusRodada = "aberta" | "fechada";

/** O que o funcionário vê no link público /clima/<slug>. */
export interface RodadaPublica {
  slug: string;
  titulo: string;
  descricao: string | null;
  temas: TemaClima[];
}

export interface RespostaClimaInput {
  notaRecomendacao: number; // 0..10
  notas: Record<string, number>; // tema_id -> 1..5
  comentario?: string | null;
  setor?: string | null;
}

/** Valida a resposta no cliente (o servidor revalida). Mapa erro por chave. */
export function validarRespostaClima(
  temas: TemaClima[],
  r: RespostaClimaInput
): Record<string, string> {
  const erros: Record<string, string> = {};
  if (!Number.isInteger(r.notaRecomendacao) || r.notaRecomendacao < 0 || r.notaRecomendacao > 10) {
    erros.recomendacao = "Escolha uma nota de 0 a 10";
  }
  for (const t of temas) {
    const n = r.notas[t.id];
    if (!Number.isInteger(n) || n < NOTA_TEMA_MIN || n > NOTA_TEMA_MAX) {
      erros[t.id] = "Dê uma nota";
    }
  }
  return erros;
}

// ── Gestão ───────────────────────────────────────────────────────────────────

export interface RodadaResumo {
  id: number;
  titulo: string;
  slug: string;
  status: StatusRodada;
  respostas: number;
  abertoEm: string;
  fechadoEm: string | null;
}

export interface EnpsBreakdown {
  score: number; // -100..100
  promotores: number;
  neutros: number;
  detratores: number;
}

export interface ClimaDashboard {
  rodada: { id: number; titulo: string; slug: string; status: StatusRodada; temas: TemaClima[] };
  total: number;
  enps: EnpsBreakdown | null;
  /** Distribuição da nota de recomendação (0..10). */
  distribuicao: { nota: number; qtd: number }[];
  /** Média por tema (1..5) e quantas responderam. */
  temas: { id: string; rotulo: string; media: number | null; respostas: number }[];
  comentarios: { comentario: string; nota: number; setor: string | null; criadoEm: string }[];
  /** Recorte por setor — só setores com respostas >= MIN_RESPOSTAS_RECORTE. */
  porSetor: { setor: string; respostas: number; enps: number | null; mediaGeral: number | null }[];
  /** eNPS ao longo das rodadas (para tendência). Mais antiga -> mais nova. */
  tendencia: { rodadaId: number; titulo: string; enps: number | null; total: number }[];
}
