import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { appQuery } from "./app-db";
import { COOKIE } from "./auth";
import { MODULOS, secoesDoModulo, type ModuloId } from "./modulos";

/**
 * Seam de permissão do Hub, no servidor.
 *
 * A doutrina (Brain: "Permissão se valida no servidor, não na interface"):
 * o cliente esconde por conveniência, mas quem TRANCA é o servidor — em toda
 * rota, sempre. E permissão é PERFIL POR SEÇÃO, não por cargo: o módulo é
 * derivado (ter ≥1 seção), a seção carrega o nível (view/edit), e o escopo de
 * empresa recorta o dado.
 *
 * `getSessao` lê o cookie opaco -> a linha `sessao` (não expirada) -> `usuario`
 * + seções acessíveis + empresas permitidas. `cache` memoiza por render, então
 * várias checagens na mesma requisição compartilham um resultado só.
 *
 * Permissão é BINÁRIA: a seção é acessível ou não (sem view/edit). Restringir o
 * que pode ser feito numa tela = separar em outra seção e não concedê-la.
 */

export interface Sessao {
  usuario: { id: string; nome: string; email: string; admin: boolean; temAvatar: boolean };
  /** Seções acessíveis. Chave "modulo/secao". Ausente = sem acesso. */
  secoes: Set<string>;
  /**
   * Escopo de empresa. `todas` ignora a lista (admin/power user); senão só
   * `permitidas` (união dos grupos + extras). `todas=false` e lista vazia =
   * nenhuma empresa.
   */
  empresas: { todas: boolean; permitidas: number[] };
}

function chaveSecao(modulo: string, secao: string): string {
  return `${modulo}/${secao}`;
}

/** Sessão do request, ou null se não houver login válido. Memoizado por render. */
export const getSessaoOpcional = cache(async (): Promise<Sessao | null> => {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;

  const [u] = await appQuery<{
    id: string;
    nome: string;
    email: string;
    admin: boolean;
    todas_empresas: boolean;
    cargo_id: number | null;
    tem_avatar: boolean;
  }>(
    `select u.id, u.nome, u.email, u.admin, u.todas_empresas, u.cargo_id,
            exists (select 1 from usuario_avatar a where a.usuario_id = u.id) as tem_avatar
       from sessao s
       join usuario u on u.id = s.usuario_id
      where s.token = $1 and s.expira_em > now() and u.ativo`,
    [token]
  );
  if (!u) return null;

  // Seções: base herdada do cargo, com o override individual por cima —
  // permitido=false BLOQUEIA uma seção que o cargo concede; true LIBERA extra.
  const secoes = new Set<string>();
  if (u.cargo_id != null) {
    const base = await appQuery<{ modulo: string; secao: string }>(
      `select modulo, secao from cargo_secao where cargo_id = $1`,
      [u.cargo_id]
    );
    for (const r of base) secoes.add(chaveSecao(r.modulo, r.secao));
  }
  const override = await appQuery<{ modulo: string; secao: string; permitido: boolean }>(
    `select modulo, secao, permitido from usuario_secao where usuario_id = $1`,
    [u.id]
  );
  for (const r of override) {
    const k = chaveSecao(r.modulo, r.secao);
    if (r.permitido) secoes.add(k);
    else secoes.delete(k);
  }

  // Empresas: união do grupo do cargo + grupos do usuário + empresas avulsas.
  let permitidas: number[] = [];
  if (!u.todas_empresas) {
    const emp = await appQuery<{ codigoempresa: number }>(
      `select codigoempresa from usuario_empresa where usuario_id = $1
       union
       select i.codigoempresa
         from usuario_grupo g
         join empresa_grupo_item i on i.grupo_id = g.grupo_id
        where g.usuario_id = $1
       union
       select i.codigoempresa
         from cargo_grupo cg
         join empresa_grupo_item i on i.grupo_id = cg.grupo_id
        where cg.cargo_id = $2`,
      [u.id, u.cargo_id]
    );
    permitidas = emp.map((e) => e.codigoempresa);
  }

  return {
    usuario: { id: u.id, nome: u.nome, email: u.email, admin: u.admin, temAvatar: u.tem_avatar },
    secoes,
    empresas: { todas: u.todas_empresas, permitidas },
  };
});

/** Garante login; sem sessão válida, manda para o /login. */
export async function getSessao(): Promise<Sessao> {
  const sessao = await getSessaoOpcional();
  if (!sessao) redirect("/login");
  return sessao;
}

/** A sessão pode acessar esta seção? Admin acessa tudo. */
export function podeSecao(sessao: Sessao, modulo: string, secao: string): boolean {
  if (sessao.usuario.admin) return true;
  return sessao.secoes.has(chaveSecao(modulo, secao));
}

/** Módulo é acessível se a sessão acessa alguma de suas seções. */
export function podeAcessarModuloSync(sessao: Sessao, modulo: ModuloId): boolean {
  return secoesDoModulo(modulo).some((s) => podeSecao(sessao, modulo, s.id));
}

/** Ids das seções do módulo que a sessão pode ver — para a sidebar. */
export function secoesVisiveis(sessao: Sessao, modulo: ModuloId): Set<string> {
  return new Set(
    secoesDoModulo(modulo)
      .filter((s) => podeSecao(sessao, modulo, s.id))
      .map((s) => s.id)
  );
}

/** Módulos (ids) que a sessão pode abrir — para o launcher. */
export function modulosAcessiveis(sessao: Sessao): ModuloId[] {
  return MODULOS.filter((m) => m.ativo && podeAcessarModuloSync(sessao, m.id)).map((m) => m.id);
}

/**
 * Caminho da primeira seção (na ordem da sidebar) que a sessão pode ver — para
 * a home do módulo entrar na aba certa mesmo quando a pessoa não acessa a
 * primeira. `undefined` se não vê nenhuma.
 */
export function primeiraSecaoPath(sessao: Sessao, modulo: ModuloId): string | undefined {
  const vis = secoesVisiveis(sessao, modulo);
  return secoesDoModulo(modulo).find((s) => vis.has(s.id))?.path;
}

export async function podeAcessarSecao(modulo: string, secao: string): Promise<boolean> {
  const sessao = await getSessaoOpcional();
  return !!sessao && podeSecao(sessao, modulo, secao);
}

export async function podeAcessarModulo(modulo: ModuloId): Promise<boolean> {
  const sessao = await getSessaoOpcional();
  return !!sessao && podeAcessarModuloSync(sessao, modulo);
}

/**
 * Gate OTIMISTA de layout de módulo: exige login e ao menos uma seção. Nega
 * mandando de volta ao launcher. Não é a tranca — layout não re-roda em
 * navegação client-side; quem barra de fato é o `apiRoute` (por seção) e o
 * `assertSecao` das páginas.
 */
export async function assertAcesso(modulo: ModuloId): Promise<Sessao> {
  const sessao = await getSessao();
  if (!podeAcessarModuloSync(sessao, modulo)) redirect("/");
  return sessao;
}

/** Gate de página de seção: nega redirecionando para a home do módulo. */
export async function assertSecao(modulo: ModuloId, secao: string): Promise<Sessao> {
  const sessao = await getSessao();
  if (!podeSecao(sessao, modulo, secao)) redirect("/");
  return sessao;
}

/** Gate da área administrativa. */
export async function assertAdmin(): Promise<Sessao> {
  const sessao = await getSessao();
  if (!sessao.usuario.admin) redirect("/");
  return sessao;
}

/**
 * Escopo de empresa da sessão para clampar consultas. `"todas"` = sem restrição.
 * Nunca confiar na lista de empresas vinda do cliente — a interseção acontece
 * no funil da query (ver buildWhere).
 */
export function empresasPermitidas(sessao: Sessao): number[] | "todas" {
  return sessao.empresas.todas ? "todas" : sessao.empresas.permitidas;
}

/** Uma empresa específica é visível para a sessão? Para checagens pontuais. */
export function podeVerEmpresa(sessao: Sessao, codigo: number): boolean {
  return sessao.empresas.todas || sessao.empresas.permitidas.includes(codigo);
}
