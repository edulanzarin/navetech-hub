import "server-only";
import { query } from "./db";
import { FilterError } from "./fiscal-filters";
import { getSessaoOpcional, empresasPermitidas } from "./sessao";
import type {
  DpColaborador,
  DpLinha,
  DpResumo,
  DpTipo,
  EsocialStatus,
} from "./dp-tipos";

/**
 * Produtividade do DP — "quem fez o quê" na folha, no período. Quatro trabalhos,
 * cada um numa tabela do Questor, todos com a auditoria embutida
 * (`codigousuario` + `datahoralcto`) que já é o padrão do Fiscal:
 *
 *   - Avisos prévios cadastrados → `funcavisoprevio`
 *   - Rescisões calculadas       → `rescisao`
 *   - Admissões feitas           → `funccontrato`
 *   - Férias calculadas          → `reciboferias`
 *
 * O recorte é por `datahoralcto` (quando o trabalho foi lançado/calculado), NÃO
 * pela data do fato (dataadm/dataresc) — é produtividade, mede o que o DP fez no
 * período. Ver [[Módulo de folha e eSocial do Questor]] e [[Logs e auditoria no Questor]].
 *
 * Escopo de empresa: mesmo funil da Folha/Fiscal — a sessão manda, a lista do
 * cliente só afunila (interseção). Diferente da Rotatividade, aqui a empresa é
 * OPCIONAL: sem empresa, varre todo o escopo (é o retrato do escritório).
 */

export interface DpFiltros {
  inicio: string;
  fim: string;
  empresas: number[];
  /** Filtra por um usuário do Questor (codigousuario). null = todos. */
  usuario: number | null;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
/** Teto de período: 1 ano, como no resto do app (evita varredura larga). */
const MAX_DIAS = 366;

export function parseDpFiltros(sp: URLSearchParams): DpFiltros {
  const inicio = sp.get("inicio") ?? "";
  const fim = sp.get("fim") ?? "";
  if (!DATE_RE.test(inicio) || !DATE_RE.test(fim)) {
    throw new FilterError("Período inválido: informe inicio e fim como YYYY-MM-DD");
  }
  if (inicio > fim) throw new FilterError("Data inicial maior que a final");
  const dias = (Date.parse(fim) - Date.parse(inicio)) / 86_400_000 + 1;
  if (dias > MAX_DIAS) throw new FilterError("Período máximo permitido: 1 ano");

  const empresas = (sp.get("empresas") ?? "")
    .split(",")
    .filter(Boolean)
    .map((v) => {
      const n = Number(v);
      if (!Number.isInteger(n) || n < 0) throw new FilterError(`Empresa inválida: ${v}`);
      return n;
    });

  const uRaw = sp.get("usuario");
  const usuario = uRaw != null && uRaw !== "" ? Number(uRaw) : null;
  if (usuario != null && !Number.isInteger(usuario)) {
    throw new FilterError(`Usuário inválido: ${uRaw}`);
  }

  return { inicio, fim, empresas, usuario };
}

/**
 * Escopo de empresa efetivo: `"todas"` = sem restrição de empresa (só o filtro do
 * cliente, se houver); senão a lista de códigos permitidos (interseção com o
 * pedido). Lista vazia não casa nada — usuário sem empresa não vê nada.
 */
async function escopoEmpresas(f: DpFiltros): Promise<number[] | "todas"> {
  const sessao = await getSessaoOpcional();
  const escopo: number[] | "todas" = sessao ? empresasPermitidas(sessao) : [];
  if (escopo === "todas") return f.empresas.length ? f.empresas : "todas";
  return f.empresas.length ? f.empresas.filter((e) => escopo.includes(e)) : escopo;
}

/**
 * Monta `[params, condEmpresa]` para uma consulta: params começa com [inicio,
 * fim] e, quando o escopo restringe, ganha o array de empresas; `condEmpresa` é
 * o fragmento SQL (` and codigoempresa = any($N::int[])`) ou vazio. Como o mesmo
 * array serve as quatro tabelas do UNION, todas referenciam o mesmo `$N`.
 */
async function baseParams(
  f: DpFiltros
): Promise<{ params: unknown[]; condEmpresa: string; usuarioIdx: number | null }> {
  const scope = await escopoEmpresas(f);
  const params: unknown[] = [f.inicio, f.fim];
  let condEmpresa = "";
  if (scope !== "todas") {
    params.push(scope);
    condEmpresa = ` and codigoempresa = any($${params.length}::int[])`;
  }
  let usuarioIdx: number | null = null;
  if (f.usuario != null) {
    params.push(f.usuario);
    usuarioIdx = params.length;
  }
  return { params, condEmpresa, usuarioIdx };
}

/** Nome do usuário legível, com fallback — repetido nas duas consultas. */
const NOME_USUARIO = `coalesce(nullif(btrim(u.nomeusuariocompl), ''), nullif(btrim(u.nomeusuario), ''), 'Usuário ' || sub.codigousuario)`;

/** nomefunc do Questor vem com espaços/tabs no fim; limpa o conjunto todo. */
const NOME_FUNC = `btrim(p.nomefunc, E' \\t\\r\\n')`;

interface RankRow {
  codigousuario: number;
  nome: string;
  inativo: boolean;
  avisos: number;
  rescisoes: number;
  admissoes: number;
  ferias: number;
  total: number;
}

interface TotaisRow {
  avisos: number;
  rescisoes: number;
  admissoes: number;
  ferias: number;
}

/** Conta os quatro trabalhos num intervalo (usado no período e no anterior). */
function subFonte(condEmpresa: string): string {
  return `
    select codigoempresa, codigousuario, 'aviso'::text tipo from funcavisoprevio where datahoralcto::date between $1 and $2${condEmpresa}
    union all
    select codigoempresa, codigousuario, 'resc'::text  from rescisao       where datahoralcto::date between $1 and $2${condEmpresa}
    union all
    select codigoempresa, codigousuario, 'adm'::text   from funccontrato   where datahoralcto::date between $1 and $2${condEmpresa}
    union all
    select codigoempresa, codigousuario, 'ferias'::text from reciboferias  where datahoralcto::date between $1 and $2${condEmpresa}`;
}

/** Período imediatamente anterior, mesma duração — para o delta dos KPIs. */
function anterior(f: DpFiltros): { inicio: string; fim: string } {
  const ini = new Date(f.inicio + "T00:00:00Z");
  const fim = new Date(f.fim + "T00:00:00Z");
  const dias = Math.round((fim.getTime() - ini.getTime()) / 86_400_000) + 1;
  const prevFim = new Date(ini.getTime() - 86_400_000);
  const prevIni = new Date(prevFim.getTime() - (dias - 1) * 86_400_000);
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  return { inicio: iso(prevIni), fim: iso(prevFim) };
}

export async function montarResumoDp(f: DpFiltros): Promise<DpResumo> {
  const { params, condEmpresa, usuarioIdx } = await baseParams(f);
  const filtroUsuario = usuarioIdx != null ? ` and codigousuario = $${usuarioIdx}` : "";

  // Ranking por usuário no período. Envolve as fontes num sub `sub` para o
  // fallback de nome referenciar sub.codigousuario.
  const rows = await query<RankRow>(
    `with fonte as (${subFonte(condEmpresa)})
     select sub.codigousuario,
            ${NOME_USUARIO} as nome,
            (u.databaixausuario is not null) as inativo,
            count(*) filter (where tipo = 'aviso')::int as avisos,
            count(*) filter (where tipo = 'resc')::int as rescisoes,
            count(*) filter (where tipo = 'adm')::int as admissoes,
            count(*) filter (where tipo = 'ferias')::int as ferias,
            count(*)::int as total
       from (select * from fonte where true${filtroUsuario}) sub
       left join usuario u on u.codigousuario = sub.codigousuario
      group by sub.codigousuario, u.nomeusuariocompl, u.nomeusuario, u.databaixausuario
      order by total desc`,
    params
  );

  const ranking = rows.map<DpColaborador>((r) => ({
    codigo: r.codigousuario,
    nome: r.codigousuario === 0 ? "Sistema (automático)" : r.nome,
    auto: r.codigousuario === 0,
    inativo: r.inativo,
    avisos: r.avisos,
    rescisoes: r.rescisoes,
    admissoes: r.admissoes,
    ferias: r.ferias,
    total: r.total,
  }));

  const soma = (sel: (c: DpColaborador) => number) => ranking.reduce((a, c) => a + sel(c), 0);
  const totais = {
    avisos: soma((c) => c.avisos),
    rescisoes: soma((c) => c.rescisoes),
    admissoes: soma((c) => c.admissoes),
    ferias: soma((c) => c.ferias),
    total: soma((c) => c.total),
  };

  // Período anterior: só as contagens (params próprios, mesmo escopo/usuário).
  const prev = anterior(f);
  const prevParams: unknown[] = [prev.inicio, prev.fim, ...params.slice(2)];
  const [tot] = await query<TotaisRow>(
    `with fonte as (select tipo from (${subFonte(condEmpresa)}) x where true${filtroUsuario})
     select count(*) filter (where tipo = 'aviso')::int as avisos,
            count(*) filter (where tipo = 'resc')::int as rescisoes,
            count(*) filter (where tipo = 'adm')::int as admissoes,
            count(*) filter (where tipo = 'ferias')::int as ferias
       from fonte`,
    prevParams
  );
  const antTot = {
    avisos: tot?.avisos ?? 0,
    rescisoes: tot?.rescisoes ?? 0,
    admissoes: tot?.admissoes ?? 0,
    ferias: tot?.ferias ?? 0,
  };

  return {
    ranking,
    totais,
    anterior: { ...antTot, total: antTot.avisos + antTot.rescisoes + antTot.admissoes + antTot.ferias },
    colaboradores: ranking.filter((c) => !c.auto && c.total > 0).length,
  };
}

/** Limite de linhas de detalhe — o dashboard resume; a lista é para conferência. */
const LIMITE_LISTA = 1000;

/** origemdado (1 manual, 2 importado, 3 integração) → rótulo. */
const ORIGEM = `case origemdado when 1 then 'Manual' when 2 then 'Importado' when 3 then 'Integração' else null end`;

const JOINS_COMUNS = `
    join funccontrato fc on fc.codigoempresa = src.codigoempresa and fc.codigofunccontr = src.codigofunccontr
    left join funcpessoa p on p.codigofuncpessoa = fc.codigofuncpessoa
    left join empresa e on e.codigoempresa = src.codigoempresa
    left join usuario u on u.codigousuario = src.codigousuario`;

/** Colunas comuns a toda linha de detalhe (a fonte é sempre o alias `src`). */
const SELECT_COMUM = `
    src.codigoempresa,
    coalesce(nullif(btrim(e.nomeempresa), ''), 'Empresa ' || src.codigoempresa) as empresa,
    src.codigofunccontr as contrato,
    coalesce(nullif(${NOME_FUNC}, ''), '(sem nome)') as funcionario,
    coalesce(nullif(btrim(u.nomeusuariocompl), ''), nullif(btrim(u.nomeusuario), ''), 'Usuário ' || src.codigousuario) as usuario,
    src.codigousuario,
    to_char(src.datahoralcto, 'YYYY-MM-DD"T"HH24:MI:SS') as quando`;

interface ListaRawBase {
  codigoempresa: number;
  empresa: string;
  contrato: number;
  funcionario: string;
  usuario: string;
  codigousuario: number;
  quando: string;
}

export async function montarListaDp(f: DpFiltros, tipo: DpTipo): Promise<DpLinha[]> {
  const { params, condEmpresa, usuarioIdx } = await baseParams(f);
  // O escopo de empresa entra qualificado por `src` (a fonte). O condEmpresa
  // genérico usa `codigoempresa` cru; aqui reescrevo para `src.codigoempresa`.
  const condEmp = condEmpresa.replace("codigoempresa", "src.codigoempresa");
  const condUsuario = usuarioIdx != null ? ` and src.codigousuario = $${usuarioIdx}` : "";
  const where = `where src.datahoralcto::date between $1 and $2${condEmp}${condUsuario}`;
  const ordem = `order by src.datahoralcto desc limit ${LIMITE_LISTA}`;

  if (tipo === "avisos" || tipo === "rescisoes") {
    const tabela = tipo === "avisos" ? "funcavisoprevio" : "rescisao";
    const rows = await query<
      ListaRawBase & { causa: string | null; data_aviso: string | null; data_resc: string | null }
    >(
      `select ${SELECT_COMUM},
              cd.descrcausa as causa,
              to_char(src.dataavprevio, 'YYYY-MM-DD') as data_aviso,
              to_char(src.dataresc, 'YYYY-MM-DD') as data_resc
         from ${tabela} src
         ${JOINS_COMUNS}
         left join causademissao cd on cd.codigocausa = src.codigocausa
         ${where}
         ${ordem}`,
      params
    );
    return rows.map((r) => ({
      codigoempresa: r.codigoempresa,
      empresa: r.empresa,
      contrato: r.contrato,
      funcionario: r.funcionario,
      usuario: r.usuario,
      codigousuario: r.codigousuario,
      quando: r.quando,
      causa: r.causa,
      dataAviso: r.data_aviso,
      dataResc: r.data_resc,
    }));
  }

  if (tipo === "admissoes") {
    const rows = await query<
      ListaRawBase & { data_adm: string | null; origem: string | null; esocial: EsocialStatus }
    >(
      `select ${SELECT_COMUM},
              to_char(src.dataadm, 'YYYY-MM-DD') as data_adm,
              (${ORIGEM.replace("origemdado", "src.origemdado")}) as origem,
              case
                when t.recibo is not null and btrim(t.recibo) <> '' then 'ok'
                when t.codigoesocialtransacao is not null then 'pendente'
                else 'nao_enviado'
              end as esocial
         from funccontrato src
         left join funcpessoa p on p.codigofuncpessoa = src.codigofuncpessoa
         left join empresa e on e.codigoempresa = src.codigoempresa
         left join usuario u on u.codigousuario = src.codigousuario
         left join lateral (
           select et.recibo, et.codigoesocialtransacao
             from esocialdadoss2200 d
             join esocialtransacao et
               on et.codigoempresa = d.codigoempresa and et.codigoesocialtransacao = d.codigoesocialtransacao
            where d.codigoempresa = src.codigoempresa and d.codigofunccontr = src.codigofunccontr
              and et.evento = 'S-2200'
            order by et.datahoralcto desc
            limit 1
         ) t on true
         ${where}
         ${ordem}`,
      params
    );
    return rows.map((r) => ({
      codigoempresa: r.codigoempresa,
      empresa: r.empresa,
      contrato: r.contrato,
      funcionario: r.funcionario,
      usuario: r.usuario,
      codigousuario: r.codigousuario,
      quando: r.quando,
      dataAdm: r.data_adm,
      origem: r.origem,
      esocial: r.esocial,
    }));
  }

  // férias
  const rows = await query<
    ListaRawBase & {
      inicio_ferias: string | null;
      fim_ferias: string | null;
      periodo_aquis: string | null;
      data_pgto: string | null;
    }
  >(
    `select ${SELECT_COMUM},
            to_char(src.datainicialferias, 'YYYY-MM-DD') as inicio_ferias,
            to_char(src.datafinalferias, 'YYYY-MM-DD') as fim_ferias,
            to_char(src.datainicial, 'YYYY-MM-DD') as periodo_aquis,
            to_char(src.datapgto, 'YYYY-MM-DD') as data_pgto
       from reciboferias src
       ${JOINS_COMUNS}
       ${where}
       ${ordem}`,
    params
  );
  return rows.map((r) => ({
    codigoempresa: r.codigoempresa,
    empresa: r.empresa,
    contrato: r.contrato,
    funcionario: r.funcionario,
    usuario: r.usuario,
    codigousuario: r.codigousuario,
    quando: r.quando,
    inicioFerias: r.inicio_ferias,
    fimFerias: r.fim_ferias,
    periodoAquisitivo: r.periodo_aquis,
    dataPgto: r.data_pgto,
  }));
}

export { FilterError };
