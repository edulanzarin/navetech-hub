import { getSessaoOpcional, empresasPermitidas } from "./sessao";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Teto de período: no máximo 1 ano (evita consultas pesadas nas tabelas gigantes). */
export const MAX_DIAS_PERIODO = 366;

export const ESPECIES_PRINCIPAIS = ["NFE", "CTE", "NFSE", "NFCE", "NF"];

export interface FiscalFilters {
  inicio: string;
  fim: string;
  empresas: number[];
  /**
   * Filiais (codigoestab) a filtrar DENTRO da empresa. Vazio = todas as filiais
   * (o consolidado da empresa). Só faz sentido com UMA empresa em escopo —
   * codigoestab não é comparável entre empresas —, e a interface só o preenche
   * nesse caso.
   */
  estabs: number[];
  especies: string[];
}

export class FilterError extends Error {}

export function parseFilters(searchParams: URLSearchParams): FiscalFilters {
  const inicio = searchParams.get("inicio") ?? "";
  const fim = searchParams.get("fim") ?? "";
  if (!DATE_RE.test(inicio) || !DATE_RE.test(fim)) {
    throw new FilterError("Período inválido: informe inicio e fim como YYYY-MM-DD");
  }
  if (inicio > fim) throw new FilterError("Data inicial maior que a final");
  const dias = (Date.parse(fim) - Date.parse(inicio)) / 86_400_000 + 1;
  if (dias > MAX_DIAS_PERIODO) throw new FilterError("Período máximo permitido: 1 ano");

  const empresas = (searchParams.get("empresas") ?? "")
    .split(",")
    .filter(Boolean)
    .map((v) => {
      const n = Number(v);
      if (!Number.isInteger(n) || n < 0) throw new FilterError(`Empresa inválida: ${v}`);
      return n;
    });

  const estabs = (searchParams.get("estabs") ?? "")
    .split(",")
    .filter(Boolean)
    .map((v) => {
      const n = Number(v);
      if (!Number.isInteger(n) || n < 0) throw new FilterError(`Filial inválida: ${v}`);
      return n;
    });

  const especies = (searchParams.get("especies") ?? "")
    .split(",")
    .filter(Boolean)
    .map((e) => e.toUpperCase().slice(0, 10));

  return { inicio, fim, empresas, estabs, especies };
}

/**
 * Monta o WHERE compartilhado por todas as consultas fiscais/contábeis.
 * Retorna o SQL (sem a palavra WHERE) e os parâmetros posicionais.
 *
 * É AQUI que o escopo de empresa do usuário é aplicado — num lugar só, para
 * nenhuma consulta escapar (doutrina: "nunca confiar na lista de empresas
 * vinda do cliente; clampar no funil da query"). A sessão é lida do request
 * (server-only, memoizada), então o call site não precisa passar nada.
 */
export async function buildWhere(
  f: FiscalFilters,
  opts: { incluirCanceladas?: boolean; alias?: string } = {}
): Promise<{ sql: string; params: unknown[] }> {
  const a = opts.alias ? `${opts.alias}.` : "";
  const params: unknown[] = [f.inicio, f.fim];
  const conds = [`${a}datalctofis between $1 and $2`];

  // Escopo de empresa: "todas" não restringe (só o filtro que o cliente pediu);
  // caso contrário, SEMPRE limita ao permitido — interseção com o pedido, e
  // lista vazia (any('{}')) não casa nada (usuário sem empresa não vê nada).
  const sessao = await getSessaoOpcional();
  const escopo: number[] | "todas" = sessao ? empresasPermitidas(sessao) : [];
  if (escopo === "todas") {
    if (f.empresas.length > 0) {
      params.push(f.empresas);
      conds.push(`${a}codigoempresa = any($${params.length}::int[])`);
    }
  } else {
    const efetivas = f.empresas.length > 0 ? f.empresas.filter((e) => escopo.includes(e)) : escopo;
    params.push(efetivas);
    conds.push(`${a}codigoempresa = any($${params.length}::int[])`);
  }

  // Filial: recorta DENTRO da empresa. Toda tabela do funil (nota, item e o
  // contábil lctoctb) tem codigoestab, então a condição vale em qualquer
  // consulta. Vazio = todas as filiais (consolidado). Ver [[filial-por-estab]].
  if (f.estabs.length > 0) {
    params.push(f.estabs);
    conds.push(`${a}codigoestab = any($${params.length}::int[])`);
  }

  if (f.especies.length > 0) {
    const listadas = f.especies.filter((e) => e !== "OUTRAS");
    const parts: string[] = [];
    if (listadas.length > 0) {
      params.push(listadas);
      parts.push(`upper(btrim(${a}especienf)) = any($${params.length}::text[])`);
    }
    if (f.especies.includes("OUTRAS")) {
      params.push(ESPECIES_PRINCIPAIS);
      parts.push(`upper(btrim(${a}especienf)) <> all($${params.length}::text[])`);
    }
    conds.push(`(${parts.join(" or ")})`);
  }

  if (!opts.incluirCanceladas) {
    conds.push(`${a}cancelada <> '1'`);
  }

  return { sql: conds.join(" and "), params };
}

/** Período imediatamente anterior, com a mesma duração — usado nos deltas dos KPIs. */
export function periodoAnterior(f: FiscalFilters): FiscalFilters {
  const ini = new Date(f.inicio + "T00:00:00Z");
  const fim = new Date(f.fim + "T00:00:00Z");
  const dias = Math.round((fim.getTime() - ini.getTime()) / 86_400_000) + 1;
  const prevFim = new Date(ini.getTime() - 86_400_000);
  const prevIni = new Date(prevFim.getTime() - (dias - 1) * 86_400_000);
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  return { ...f, inicio: iso(prevIni), fim: iso(prevFim) };
}
