import "server-only";
import { randomBytes } from "node:crypto";
import { appQuery } from "./app-db";
import {
  MIN_RESPOSTAS_RECORTE,
  NOTA_TEMA_MAX,
  NOTA_TEMA_MIN,
  validarRespostaClima,
  type ClimaDashboard,
  type EnpsBreakdown,
  type RespostaClimaInput,
  type RodadaPublica,
  type RodadaResumo,
  type StatusRodada,
  type TemaClima,
} from "./clima-tipos";

/**
 * CLIMA (avaliação anônima da empresa) — lógica no servidor. Link público aberto
 * por rodada (slug); cada pessoa responde uma vez, anonimamente. Nenhuma coluna
 * de identidade: o que sai daqui não amarra resposta a pessoa.
 */

const TEMAS_PADRAO: TemaClima[] = [
  { id: "lideranca", rotulo: "Liderança" },
  { id: "ambiente", rotulo: "Ambiente de trabalho" },
  { id: "remuneracao", rotulo: "Remuneração e benefícios" },
  { id: "carga", rotulo: "Carga de trabalho" },
  { id: "reconhecimento", rotulo: "Reconhecimento" },
  { id: "comunicacao", rotulo: "Comunicação" },
];

function slugify(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 40) || "rodada";
}

// ── Público ──────────────────────────────────────────────────────────────────

interface LinhaRodada {
  id: number;
  titulo: string;
  descricao: string | null;
  slug: string;
  status: StatusRodada;
  temas: TemaClima[];
}

export async function rodadaAbertaPorSlug(slug: string): Promise<RodadaPublica | null> {
  const [r] = await appQuery<LinhaRodada>(
    `select id, titulo, descricao, slug, status, temas
       from clima_rodada where slug = $1 and status = 'aberta'`,
    [slug]
  );
  if (!r) return null;
  return { slug: r.slug, titulo: r.titulo, descricao: r.descricao, temas: r.temas };
}

export async function salvarRespostaClima(
  slug: string,
  input: RespostaClimaInput
): Promise<{ ok: boolean; erro?: string }> {
  const [r] = await appQuery<{ id: number; temas: TemaClima[] }>(
    `select id, temas from clima_rodada where slug = $1 and status = 'aberta'`,
    [slug]
  );
  if (!r) return { ok: false, erro: "Esta avaliação não está mais disponível" };

  const erros = validarRespostaClima(r.temas, input);
  if (Object.keys(erros).length) return { ok: false, erro: "Revise as notas antes de enviar" };

  // Só guarda notas de temas que existem na rodada, dentro da faixa.
  const idsValidos = new Set(r.temas.map((t) => t.id));
  const notas: Record<string, number> = {};
  for (const [id, n] of Object.entries(input.notas)) {
    if (idsValidos.has(id) && Number.isInteger(n) && n >= NOTA_TEMA_MIN && n <= NOTA_TEMA_MAX) {
      notas[id] = n;
    }
  }
  const comentario = input.comentario?.trim() || null;
  const setor = input.setor?.trim() || null;

  await appQuery(
    `insert into clima_resposta (rodada_id, nota_recomendacao, notas, comentario, setor)
     values ($1, $2, $3, $4, $5)`,
    [r.id, input.notaRecomendacao, JSON.stringify(notas), comentario, setor]
  );
  return { ok: true };
}

// ── Gestão (RH) ──────────────────────────────────────────────────────────────

export async function listarRodadas(): Promise<RodadaResumo[]> {
  const rows = await appQuery<{
    id: number;
    titulo: string;
    slug: string;
    status: StatusRodada;
    respostas: number;
    aberto_em: Date;
    fechado_em: Date | null;
  }>(
    `select r.id, r.titulo, r.slug, r.status, r.aberto_em, r.fechado_em,
            (select count(*)::int from clima_resposta c where c.rodada_id = r.id) as respostas
       from clima_rodada r
      order by r.aberto_em desc`
  );
  return rows.map((r) => ({
    id: r.id,
    titulo: r.titulo,
    slug: r.slug,
    status: r.status,
    respostas: r.respostas,
    abertoEm: r.aberto_em.toISOString(),
    fechadoEm: r.fechado_em ? r.fechado_em.toISOString() : null,
  }));
}

export async function criarRodada(dados: {
  titulo: string;
  descricao?: string | null;
  temas?: TemaClima[];
}): Promise<{ ok: boolean; erro?: string; id?: number; slug?: string }> {
  const titulo = String(dados.titulo || "").trim();
  if (!titulo) return { ok: false, erro: "Dê um título à rodada" };
  const temas = dados.temas?.length ? dados.temas : TEMAS_PADRAO;
  const base = slugify(titulo);

  for (let tentativa = 0; tentativa < 5; tentativa++) {
    const slug = tentativa === 0 ? base : `${base}-${randomBytes(2).toString("hex")}`;
    try {
      const [linha] = await appQuery<{ id: number; slug: string }>(
        `insert into clima_rodada (titulo, descricao, slug, temas)
         values ($1, $2, $3, $4) returning id, slug`,
        [titulo, dados.descricao?.trim() || null, slug, JSON.stringify(temas)]
      );
      return { ok: true, id: linha.id, slug: linha.slug };
    } catch (err) {
      if ((err as { code?: string })?.code === "23505") continue; // slug em uso
      throw err;
    }
  }
  return { ok: false, erro: "Não foi possível criar a rodada — tente outro título" };
}

export async function definirStatusRodada(
  id: number,
  status: StatusRodada
): Promise<{ ok: boolean; erro?: string }> {
  const r = await appQuery<{ id: number }>(
    `update clima_rodada
        set status = $2,
            fechado_em = case when $2 = 'fechada' then now() else null end
      where id = $1 returning id`,
    [id, status]
  );
  if (!r.length) return { ok: false, erro: "Rodada não encontrada" };
  return { ok: true };
}

/** eNPS a partir das notas de recomendação (0..10). null se não há respostas. */
function calcularEnps(notas: number[]): EnpsBreakdown | null {
  if (!notas.length) return null;
  let promotores = 0;
  let detratores = 0;
  let neutros = 0;
  for (const n of notas) {
    if (n >= 9) promotores++;
    else if (n <= 6) detratores++;
    else neutros++;
  }
  const score = Math.round(((promotores - detratores) / notas.length) * 100);
  return { score, promotores, neutros, detratores };
}

export async function dashboardClima(rodadaId: number): Promise<ClimaDashboard | null> {
  const [rodada] = await appQuery<LinhaRodada>(
    `select id, titulo, descricao, slug, status, temas from clima_rodada where id = $1`,
    [rodadaId]
  );
  if (!rodada) return null;

  const respostas = await appQuery<{
    nota_recomendacao: number;
    notas: Record<string, number>;
    comentario: string | null;
    setor: string | null;
    criado_em: Date;
  }>(
    `select nota_recomendacao, notas, comentario, setor, criado_em
       from clima_resposta where rodada_id = $1 order by criado_em desc`,
    [rodadaId]
  );

  const total = respostas.length;
  const enps = calcularEnps(respostas.map((r) => r.nota_recomendacao));

  // Distribuição 0..10 (mostra buracos como zero).
  const dist = new Array(11).fill(0) as number[];
  for (const r of respostas) dist[r.nota_recomendacao]++;
  const distribuicao = dist.map((qtd, nota) => ({ nota, qtd }));

  // Média por tema.
  const temas = rodada.temas.map((t) => {
    let soma = 0;
    let n = 0;
    for (const r of respostas) {
      const v = r.notas?.[t.id];
      if (typeof v === "number") {
        soma += v;
        n++;
      }
    }
    return { id: t.id, rotulo: t.rotulo, media: n ? soma / n : null, respostas: n };
  });

  const comentarios = respostas
    .filter((r) => r.comentario)
    .map((r) => ({
      comentario: r.comentario as string,
      nota: r.nota_recomendacao,
      setor: r.setor,
      criadoEm: r.criado_em.toISOString(),
    }));

  // Recorte por setor — só com N mínimo, para não deanonimizar time pequeno.
  const grupos = new Map<string, { notas: number[]; temaSoma: number; temaN: number }>();
  for (const r of respostas) {
    if (!r.setor) continue;
    const g = grupos.get(r.setor) ?? { notas: [], temaSoma: 0, temaN: 0 };
    g.notas.push(r.nota_recomendacao);
    for (const v of Object.values(r.notas ?? {})) {
      if (typeof v === "number") {
        g.temaSoma += v;
        g.temaN++;
      }
    }
    grupos.set(r.setor, g);
  }
  const porSetor = [...grupos.entries()]
    .filter(([, g]) => g.notas.length >= MIN_RESPOSTAS_RECORTE)
    .map(([setor, g]) => ({
      setor,
      respostas: g.notas.length,
      enps: calcularEnps(g.notas)?.score ?? null,
      mediaGeral: g.temaN ? g.temaSoma / g.temaN : null,
    }))
    .sort((a, b) => (b.enps ?? -101) - (a.enps ?? -101));

  // Tendência: eNPS por rodada (todas), mais antiga -> mais nova.
  const tend = await appQuery<{
    id: number;
    titulo: string;
    total: number;
    prom: number;
    detr: number;
    aberto_em: Date;
  }>(
    `select r.id, r.titulo, r.aberto_em,
            count(c.*)::int as total,
            count(c.*) filter (where c.nota_recomendacao >= 9)::int as prom,
            count(c.*) filter (where c.nota_recomendacao <= 6)::int as detr
       from clima_rodada r
       left join clima_resposta c on c.rodada_id = r.id
      group by r.id, r.titulo, r.aberto_em
      order by r.aberto_em asc`
  );
  const tendencia = tend.map((t) => ({
    rodadaId: t.id,
    titulo: t.titulo,
    total: t.total,
    enps: t.total ? Math.round(((t.prom - t.detr) / t.total) * 100) : null,
  }));

  return {
    rodada: { id: rodada.id, titulo: rodada.titulo, slug: rodada.slug, status: rodada.status, temas: rodada.temas },
    total,
    enps,
    distribuicao,
    temas,
    comentarios,
    porSetor,
    tendencia,
  };
}
