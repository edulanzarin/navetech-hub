"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { appPool, appQuery } from "@/lib/app-db";
import { hashSenha } from "@/lib/auth";
import { assertAdmin } from "@/lib/sessao";
import { MODULOS, secoesDoModulo } from "@/lib/modulos";

/** Conjunto válido de "modulo/secao" — barra chaves forjadas no form. */
function secoesValidas(): Set<string> {
  const s = new Set<string>();
  for (const m of MODULOS) for (const sec of secoesDoModulo(m.id)) s.add(`${m.id}/${sec.id}`);
  return s;
}

type NivelForm = "none" | "view" | "edit";

/** Lê os rádios "sec:<modulo>:<secao>" do form, só as chaves válidas. */
function lerSecoes(formData: FormData): { modulo: string; secao: string; nivel: NivelForm }[] {
  const validas = secoesValidas();
  const out: { modulo: string; secao: string; nivel: NivelForm }[] = [];
  for (const [k, v] of formData.entries()) {
    if (!k.startsWith("sec:")) continue;
    const nivel = String(v);
    if (nivel !== "none" && nivel !== "view" && nivel !== "edit") continue;
    const [, modulo, secao] = k.split(":");
    if (validas.has(`${modulo}/${secao}`)) out.push({ modulo, secao, nivel });
  }
  return out;
}

const limpo = (v: FormDataEntryValue | null): string | null => {
  const s = String(v ?? "").trim();
  return s || null;
};

const idNum = (v: FormDataEntryValue | null): number | null => {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : null;
};

type Q = (sql: string, p?: unknown[]) => Promise<{ rows: Record<string, unknown>[] }>;

async function comTransacao<T>(fn: (q: Q) => Promise<T>): Promise<T> {
  const client = await appPool.connect();
  try {
    await client.query("begin");
    const r = await fn((sql, p) => client.query(sql, p));
    await client.query("commit");
    return r;
  } catch (err) {
    await client.query("rollback");
    throw err;
  } finally {
    client.release();
  }
}

// ------------------------------------------------------------------ Usuários

export async function salvarUsuario(formData: FormData): Promise<void> {
  await assertAdmin();

  const id = String(formData.get("id") ?? "").trim();
  const nome = String(formData.get("nome") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const senha = String(formData.get("senha") ?? "");
  const telefone = limpo(formData.get("telefone"));
  const cargoId = idNum(formData.get("cargo_id"));
  const ativo = formData.get("ativo") === "on";
  const admin = formData.get("admin") === "on";
  const todasEmpresas = admin || formData.get("todas_empresas") === "on";

  if (!nome || !email) throw new Error("Nome e email são obrigatórios");
  if (!id && !senha) throw new Error("Defina uma senha para o novo usuário");

  // Foto de perfil: arquivo novo (substitui) ou pedido de remoção. Valida tipo e
  // tamanho no servidor — nunca confiar no accept do input.
  const removerFoto = formData.get("remover_foto") === "on";
  const arquivo = formData.get("avatar");
  let avatar: { mime: string; bytes: Buffer } | null = null;
  if (arquivo instanceof File && arquivo.size > 0) {
    if (!arquivo.type.startsWith("image/")) throw new Error("A foto precisa ser uma imagem");
    if (arquivo.size > 2 * 1024 * 1024) throw new Error("A foto deve ter no máximo 2 MB");
    avatar = { mime: arquivo.type, bytes: Buffer.from(await arquivo.arrayBuffer()) };
  }

  // Base do cargo escolhido: só guardamos usuario_secao quando o nível pedido
  // DIFERE do que o cargo já concede (delta). Igual = herda, sem linha.
  const base: Record<string, NivelForm> = {};
  if (cargoId != null) {
    const rows = await appQuery<{ modulo: string; secao: string; nivel: "view" | "edit" }>(
      `select modulo, secao, nivel from cargo_secao where cargo_id = $1`,
      [cargoId]
    );
    for (const r of rows) base[`${r.modulo}/${r.secao}`] = r.nivel;
  }
  const overrides = lerSecoes(formData).filter((s) => {
    const herdado = base[`${s.modulo}/${s.secao}`] ?? "none";
    return s.nivel !== herdado; // só o que difere do cargo vira override
  });

  const grupos = formData.getAll("grupos").map((g) => Number(g)).filter(Number.isInteger);
  const empresas = formData.getAll("empresas").map((e) => Number(e)).filter(Number.isInteger);

  const senhaHash = senha ? await hashSenha(senha) : null;

  await comTransacao(async (q) => {
    let usuarioId = id;
    if (id) {
      await q(
        `update usuario set nome = $2, email = $3, telefone = $4, cargo_id = $5,
                ativo = $6, admin = $7, todas_empresas = $8
           ${senhaHash ? ", senha_hash = $9" : ""}
         where id = $1`,
        senhaHash
          ? [id, nome, email, telefone, cargoId, ativo, admin, todasEmpresas, senhaHash]
          : [id, nome, email, telefone, cargoId, ativo, admin, todasEmpresas]
      );
    } else {
      const { rows } = await q(
        `insert into usuario (nome, email, telefone, cargo_id, senha_hash, ativo, admin, todas_empresas)
         values ($1, $2, $3, $4, $5, $6, $7, $8) returning id`,
        [nome, email, telefone, cargoId, senhaHash, ativo, admin, todasEmpresas]
      );
      usuarioId = rows[0].id as string;
    }

    // Foto: remoção explícita ou upsert do arquivo novo (mantém a atual se nada
    // veio no form).
    if (removerFoto) {
      await q(`delete from usuario_avatar where usuario_id = $1`, [usuarioId]);
    } else if (avatar) {
      await q(
        `insert into usuario_avatar (usuario_id, mime, bytes, atualizado_em)
         values ($1, $2, $3, now())
         on conflict (usuario_id) do update
           set mime = excluded.mime, bytes = excluded.bytes, atualizado_em = now()`,
        [usuarioId, avatar.mime, avatar.bytes]
      );
    }

    // Overrides, grupos e empresas: recria do zero (o form é a verdade completa).
    await q(`delete from usuario_secao where usuario_id = $1`, [usuarioId]);
    for (const o of overrides) {
      await q(
        `insert into usuario_secao (usuario_id, modulo, secao, nivel) values ($1, $2, $3, $4)`,
        [usuarioId, o.modulo, o.secao, o.nivel]
      );
    }
    await q(`delete from usuario_grupo where usuario_id = $1`, [usuarioId]);
    for (const g of grupos) {
      await q(`insert into usuario_grupo (usuario_id, grupo_id) values ($1, $2)`, [usuarioId, g]);
    }
    await q(`delete from usuario_empresa where usuario_id = $1`, [usuarioId]);
    for (const e of empresas) {
      await q(`insert into usuario_empresa (usuario_id, codigoempresa) values ($1, $2)`, [usuarioId, e]);
    }
  });

  revalidatePath("/admin/usuarios");
  redirect("/admin/usuarios");
}

export async function excluirUsuario(formData: FormData): Promise<void> {
  const sessao = await assertAdmin();
  const id = String(formData.get("id") ?? "");
  // Um admin não se exclui sozinho (evita ficar sem nenhum admin por engano).
  if (id && id !== sessao.usuario.id) {
    await appPool.query(`delete from usuario where id = $1`, [id]);
  }
  revalidatePath("/admin/usuarios");
  redirect("/admin/usuarios");
}

// -------------------------------------------------------------------- Cargos

export async function salvarCargo(formData: FormData): Promise<void> {
  await assertAdmin();
  const id = idNum(formData.get("id"));
  const nome = String(formData.get("nome") ?? "").trim();
  if (!nome) throw new Error("Dê um nome ao cargo");
  const setorId = idNum(formData.get("setor_id"));
  const descricao = limpo(formData.get("descricao"));
  // Cargo só concede (view/edit); 'none' = não faz parte do cargo.
  const secoes = lerSecoes(formData).filter((s) => s.nivel !== "none");
  const grupos = formData.getAll("grupos").map((g) => Number(g)).filter(Number.isInteger);

  await comTransacao(async (q) => {
    let cargoId = id;
    if (id != null) {
      await q(`update cargo set nome = $2, setor_id = $3, descricao = $4 where id = $1`, [
        id,
        nome,
        setorId,
        descricao,
      ]);
    } else {
      const { rows } = await q(
        `insert into cargo (nome, setor_id, descricao) values ($1, $2, $3) returning id`,
        [nome, setorId, descricao]
      );
      cargoId = rows[0].id as number;
    }
    await q(`delete from cargo_secao where cargo_id = $1`, [cargoId]);
    for (const s of secoes) {
      await q(`insert into cargo_secao (cargo_id, modulo, secao, nivel) values ($1, $2, $3, $4)`, [
        cargoId,
        s.modulo,
        s.secao,
        s.nivel,
      ]);
    }
    await q(`delete from cargo_grupo where cargo_id = $1`, [cargoId]);
    for (const g of grupos) {
      await q(`insert into cargo_grupo (cargo_id, grupo_id) values ($1, $2)`, [cargoId, g]);
    }
  });

  revalidatePath("/admin/cargos");
  redirect("/admin/cargos");
}

export async function excluirCargo(formData: FormData): Promise<void> {
  await assertAdmin();
  const id = idNum(formData.get("id"));
  // Usuários com este cargo ficam sem cargo (FK on delete set null).
  if (id != null) await appPool.query(`delete from cargo where id = $1`, [id]);
  revalidatePath("/admin/cargos");
  redirect("/admin/cargos");
}

// -------------------------------------------------------------------- Setores

export async function salvarSetor(formData: FormData): Promise<void> {
  await assertAdmin();
  const id = idNum(formData.get("id"));
  const nome = String(formData.get("nome") ?? "").trim();
  if (!nome) throw new Error("Dê um nome ao setor");
  if (id != null) {
    await appPool.query(`update setor set nome = $2 where id = $1`, [id, nome]);
  } else {
    await appPool.query(`insert into setor (nome) values ($1)`, [nome]);
  }
  revalidatePath("/admin/setores");
  redirect("/admin/setores");
}

export async function excluirSetor(formData: FormData): Promise<void> {
  await assertAdmin();
  const id = idNum(formData.get("id"));
  // Cargos do setor ficam sem setor (FK on delete set null).
  if (id != null) await appPool.query(`delete from setor where id = $1`, [id]);
  revalidatePath("/admin/setores");
  redirect("/admin/setores");
}

// -------------------------------------------------------------------- Grupos

export async function salvarGrupo(formData: FormData): Promise<void> {
  await assertAdmin();
  const id = Number(formData.get("id"));
  const nome = String(formData.get("nome") ?? "").trim();
  if (!nome) throw new Error("Dê um nome ao grupo");
  const empresas = formData.getAll("empresas").map((e) => Number(e)).filter(Number.isInteger);

  await comTransacao(async (q) => {
    let grupoId = id;
    if (Number.isInteger(id) && id > 0) {
      await q(`update empresa_grupo set nome = $2 where id = $1`, [id, nome]);
    } else {
      const { rows } = await q(
        `insert into empresa_grupo (nome) values ($1) returning id`,
        [nome]
      );
      grupoId = rows[0].id as number;
    }
    await q(`delete from empresa_grupo_item where grupo_id = $1`, [grupoId]);
    for (const e of empresas) {
      await q(`insert into empresa_grupo_item (grupo_id, codigoempresa) values ($1, $2)`, [grupoId, e]);
    }
  });

  revalidatePath("/admin/grupos");
  redirect("/admin/grupos");
}

export async function excluirGrupo(formData: FormData): Promise<void> {
  await assertAdmin();
  const id = Number(formData.get("id"));
  if (Number.isInteger(id) && id > 0) {
    await appPool.query(`delete from empresa_grupo where id = $1`, [id]);
  }
  revalidatePath("/admin/grupos");
  redirect("/admin/grupos");
}
