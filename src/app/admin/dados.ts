import "server-only";
import { appQuery } from "@/lib/app-db";
import { query } from "@/lib/db";
import type { Nivel } from "@/lib/sessao";

/**
 * Leituras da área admin. Usuários/grupos/cargos vêm do banco do app; a lista de
 * empresas vem do Questor (read-only) — o admin monta o escopo escolhendo entre
 * TODAS as empresas, independente do escopo dele.
 *
 * Modelo: o CARGO é o molde (seções + grupos de empresa). O usuário herda um
 * cargo e ajusta por cima — seção via override (`usuario_secao`, com 'none'
 * negando) e empresa somando (`usuario_grupo`/`usuario_empresa`).
 */

/** Nível de um override individual de seção: 'none' NEGA o que o cargo concede. */
export type NivelOverride = Nivel | "none";

export interface UsuarioDetalhe {
  id: string;
  nome: string;
  email: string;
  telefone: string | null;
  ativo: boolean;
  admin: boolean;
  todas_empresas: boolean;
  cargo_id: number | null;
  cargoNome: string | null;
  setorNome: string | null;
  /** Timestamp da foto (ms), para cache-buster no <img>; null = sem foto. */
  avatarVersao: number | null;
  /** Overrides individuais de seção ("modulo/secao" -> nível), por cima do cargo. */
  overrides: Record<string, NivelOverride>;
  grupos: number[];
  empresas: number[];
}

export async function carregarUsuario(id: string): Promise<UsuarioDetalhe | null> {
  const [u] = await appQuery<{
    id: string;
    nome: string;
    email: string;
    telefone: string | null;
    ativo: boolean;
    admin: boolean;
    todas_empresas: boolean;
    cargo_id: number | null;
    cargo_nome: string | null;
    setor_nome: string | null;
    avatar_versao: string | null;
  }>(
    `select u.id, u.nome, u.email, u.telefone, u.ativo, u.admin, u.todas_empresas,
            u.cargo_id, c.nome as cargo_nome, st.nome as setor_nome,
            extract(epoch from a.atualizado_em) * 1000 as avatar_versao
       from usuario u
       left join cargo c on c.id = u.cargo_id
       left join setor st on st.id = c.setor_id
       left join usuario_avatar a on a.usuario_id = u.id
      where u.id = $1`,
    [id]
  );
  if (!u) return null;

  const [overrides, grupos, empresas] = await Promise.all([
    appQuery<{ modulo: string; secao: string; nivel: NivelOverride }>(
      `select modulo, secao, nivel from usuario_secao where usuario_id = $1`,
      [id]
    ),
    appQuery<{ grupo_id: number }>(`select grupo_id from usuario_grupo where usuario_id = $1`, [id]),
    appQuery<{ codigoempresa: number }>(
      `select codigoempresa from usuario_empresa where usuario_id = $1`,
      [id]
    ),
  ]);

  const overMap: Record<string, NivelOverride> = {};
  for (const s of overrides) overMap[`${s.modulo}/${s.secao}`] = s.nivel;

  return {
    id: u.id,
    nome: u.nome,
    email: u.email,
    telefone: u.telefone,
    ativo: u.ativo,
    admin: u.admin,
    todas_empresas: u.todas_empresas,
    cargo_id: u.cargo_id,
    cargoNome: u.cargo_nome,
    setorNome: u.setor_nome,
    avatarVersao: u.avatar_versao != null ? Math.round(Number(u.avatar_versao)) : null,
    overrides: overMap,
    grupos: grupos.map((g) => g.grupo_id),
    empresas: empresas.map((e) => e.codigoempresa),
  };
}

export interface UsuarioLista {
  id: string;
  nome: string;
  email: string;
  cargoNome: string | null;
  setorNome: string | null;
  ativo: boolean;
  admin: boolean;
  todas_empresas: boolean;
  ultimo_acesso: string | null;
  avatarVersao: number | null;
}

/** Lista de usuários para a tela de administração (rica, ordenada por nome). */
export async function listarUsuarios(): Promise<UsuarioLista[]> {
  const rows = await appQuery<{
    id: string;
    nome: string;
    email: string;
    cargo_nome: string | null;
    setor_nome: string | null;
    ativo: boolean;
    admin: boolean;
    todas_empresas: boolean;
    ultimo_acesso: string | null;
    avatar_versao: string | null;
  }>(
    `select u.id, u.nome, u.email, c.nome as cargo_nome, st.nome as setor_nome,
            u.ativo, u.admin, u.todas_empresas,
            to_char(u.ultimo_acesso, 'YYYY-MM-DD"T"HH24:MI:SS') as ultimo_acesso,
            extract(epoch from a.atualizado_em) * 1000 as avatar_versao
       from usuario u
       left join cargo c on c.id = u.cargo_id
       left join setor st on st.id = c.setor_id
       left join usuario_avatar a on a.usuario_id = u.id
      order by u.nome`
  );
  return rows.map((r) => ({
    id: r.id,
    nome: r.nome,
    email: r.email,
    cargoNome: r.cargo_nome,
    setorNome: r.setor_nome,
    ativo: r.ativo,
    admin: r.admin,
    todas_empresas: r.todas_empresas,
    ultimo_acesso: r.ultimo_acesso,
    avatarVersao: r.avatar_versao != null ? Math.round(Number(r.avatar_versao)) : null,
  }));
}

// ---------------------------------------------------------------- Cargos/setores

export interface SetorResumo {
  id: number;
  nome: string;
  cargos: number;
}

export async function listarSetores(): Promise<SetorResumo[]> {
  return appQuery<SetorResumo>(
    `select s.id, s.nome, count(c.id)::int as cargos
       from setor s
       left join cargo c on c.setor_id = s.id
      group by s.id
      order by s.nome`
  );
}

export interface SetorOpcao {
  id: number;
  nome: string;
}

export async function carregarSetor(id: number): Promise<SetorOpcao | null> {
  const [s] = await appQuery<SetorOpcao>(`select id, nome from setor where id = $1`, [id]);
  return s ?? null;
}

export interface CargoResumo {
  id: number;
  nome: string;
  setorNome: string | null;
  secoes: number;
  grupos: number;
  usuarios: number;
}

export async function listarCargos(): Promise<CargoResumo[]> {
  const rows = await appQuery<{
    id: number;
    nome: string;
    setor_nome: string | null;
    secoes: number;
    grupos: number;
    usuarios: number;
  }>(
    `select c.id, c.nome, st.nome as setor_nome,
            (select count(*)::int from cargo_secao cs where cs.cargo_id = c.id) as secoes,
            (select count(*)::int from cargo_grupo cg where cg.cargo_id = c.id) as grupos,
            (select count(*)::int from usuario u where u.cargo_id = c.id) as usuarios
       from cargo c
       left join setor st on st.id = c.setor_id
      order by st.nome nulls last, c.nome`
  );
  return rows.map((r) => ({
    id: r.id,
    nome: r.nome,
    setorNome: r.setor_nome,
    secoes: r.secoes,
    grupos: r.grupos,
    usuarios: r.usuarios,
  }));
}

export interface CargoDetalhe {
  id: number;
  nome: string;
  setor_id: number | null;
  descricao: string | null;
  /** Seções do cargo: "modulo/secao" -> nível. */
  secoes: Record<string, Nivel>;
  grupos: number[];
}

export async function carregarCargo(id: number): Promise<CargoDetalhe | null> {
  const [c] = await appQuery<{
    id: number;
    nome: string;
    setor_id: number | null;
    descricao: string | null;
  }>(`select id, nome, setor_id, descricao from cargo where id = $1`, [id]);
  if (!c) return null;

  const [secoes, grupos] = await Promise.all([
    appQuery<{ modulo: string; secao: string; nivel: Nivel }>(
      `select modulo, secao, nivel from cargo_secao where cargo_id = $1`,
      [id]
    ),
    appQuery<{ grupo_id: number }>(`select grupo_id from cargo_grupo where cargo_id = $1`, [id]),
  ]);

  const secMap: Record<string, Nivel> = {};
  for (const s of secoes) secMap[`${s.modulo}/${s.secao}`] = s.nivel;

  return {
    id: c.id,
    nome: c.nome,
    setor_id: c.setor_id,
    descricao: c.descricao,
    secoes: secMap,
    grupos: grupos.map((g) => g.grupo_id),
  };
}

/** Cargos com sua base (seções + grupos), para o form de usuário mostrar a herança. */
export interface CargoOpcao {
  id: number;
  nome: string;
  setorNome: string | null;
  secoes: Record<string, Nivel>;
  grupos: number[];
}

export async function listarCargosParaForm(): Promise<CargoOpcao[]> {
  const cargos = await appQuery<{ id: number; nome: string; setor_nome: string | null }>(
    `select c.id, c.nome, st.nome as setor_nome
       from cargo c
       left join setor st on st.id = c.setor_id
      order by st.nome nulls last, c.nome`
  );
  if (cargos.length === 0) return [];

  const [secoes, grupos] = await Promise.all([
    appQuery<{ cargo_id: number; modulo: string; secao: string; nivel: Nivel }>(
      `select cargo_id, modulo, secao, nivel from cargo_secao`
    ),
    appQuery<{ cargo_id: number; grupo_id: number }>(`select cargo_id, grupo_id from cargo_grupo`),
  ]);

  const secPorCargo = new Map<number, Record<string, Nivel>>();
  for (const s of secoes) {
    const m = secPorCargo.get(s.cargo_id) ?? {};
    m[`${s.modulo}/${s.secao}`] = s.nivel;
    secPorCargo.set(s.cargo_id, m);
  }
  const grpPorCargo = new Map<number, number[]>();
  for (const g of grupos) {
    const arr = grpPorCargo.get(g.cargo_id) ?? [];
    arr.push(g.grupo_id);
    grpPorCargo.set(g.cargo_id, arr);
  }

  return cargos.map((c) => ({
    id: c.id,
    nome: c.nome,
    setorNome: c.setor_nome,
    secoes: secPorCargo.get(c.id) ?? {},
    grupos: grpPorCargo.get(c.id) ?? [],
  }));
}

// -------------------------------------------------------------------- Grupos

export interface GrupoResumo {
  id: number;
  nome: string;
  empresas: number;
  cargos: number;
  usuarios: number;
}

export async function listarGrupos(): Promise<GrupoResumo[]> {
  return appQuery<GrupoResumo>(
    `select g.id, g.nome,
            (select count(*)::int from empresa_grupo_item i where i.grupo_id = g.id) as empresas,
            (select count(*)::int from cargo_grupo cg where cg.grupo_id = g.id) as cargos,
            (select count(*)::int from usuario_grupo ug where ug.grupo_id = g.id) as usuarios
       from empresa_grupo g
      order by g.nome`
  );
}

export interface GrupoDetalhe {
  id: number;
  nome: string;
  empresas: number[];
}

export async function carregarGrupo(id: number): Promise<GrupoDetalhe | null> {
  const [g] = await appQuery<{ id: number; nome: string }>(
    `select id, nome from empresa_grupo where id = $1`,
    [id]
  );
  if (!g) return null;
  const itens = await appQuery<{ codigoempresa: number }>(
    `select codigoempresa from empresa_grupo_item where grupo_id = $1`,
    [id]
  );
  return { ...g, empresas: itens.map((i) => i.codigoempresa) };
}

export interface EmpresaOpcao {
  codigo: number;
  nome: string;
}

/** Todas as empresas do Questor — para o admin escolher o escopo. */
export async function listarTodasEmpresas(): Promise<EmpresaOpcao[]> {
  return query<EmpresaOpcao>(
    `select codigoempresa as codigo, nomeempresa as nome from empresa order by nomeempresa`
  );
}
