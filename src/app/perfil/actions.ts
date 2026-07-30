"use server";

import { revalidatePath } from "next/cache";
import { appQuery } from "@/lib/app-db";
import {
  hashSenha,
  verificarSenha,
  tokenAtual,
  encerrarOutrasSessoes,
} from "@/lib/auth";
import { getSessao } from "@/lib/sessao";

export interface PerfilState {
  erro?: string;
  ok?: string;
}

/**
 * Atualiza o PRÓPRIO perfil: só foto e senha. O alvo é sempre o usuário da
 * sessão (nunca um id vindo do form) — por isso a pessoa não consegue mexer no
 * cadastro de outrem, nem no próprio nome/email/permissões (isso é do admin).
 * Trocar senha exige a senha atual: um cookie roubado não vira troca de senha.
 */
export async function atualizarPerfil(_prev: PerfilState, formData: FormData): Promise<PerfilState> {
  const sessao = await getSessao();
  const id = sessao.usuario.id;

  // Foto: arquivo novo (substitui), pedido de remoção, ou nada. Valida tipo e
  // tamanho no servidor — nunca confiar no accept do input.
  const removerFoto = formData.get("remover_foto") === "on";
  const arquivo = formData.get("avatar");
  let avatar: { mime: string; bytes: Buffer } | null = null;
  if (arquivo instanceof File && arquivo.size > 0) {
    if (!arquivo.type.startsWith("image/")) return { erro: "A foto precisa ser uma imagem" };
    if (arquivo.size > 2 * 1024 * 1024) return { erro: "A foto deve ter no máximo 2 MB" };
    avatar = { mime: arquivo.type, bytes: Buffer.from(await arquivo.arrayBuffer()) };
  }

  // Senha: só entra no fluxo se algum dos campos foi preenchido.
  const atual = String(formData.get("senha_atual") ?? "");
  const nova = String(formData.get("senha_nova") ?? "");
  const confirma = String(formData.get("senha_confirma") ?? "");
  let senhaHash: string | null = null;
  if (atual || nova || confirma) {
    if (nova.length < 8) return { erro: "A nova senha deve ter ao menos 8 caracteres" };
    if (nova !== confirma) return { erro: "A confirmação não bate com a nova senha" };
    const [row] = await appQuery<{ senha_hash: string }>(
      `select senha_hash from usuario where id = $1`,
      [id]
    );
    if (!row || !(await verificarSenha(atual, row.senha_hash))) {
      return { erro: "Senha atual incorreta" };
    }
    senhaHash = await hashSenha(nova);
  }

  if (!avatar && !removerFoto && !senhaHash) {
    return { erro: "Nada para salvar — escolha uma foto ou troque a senha" };
  }

  if (senhaHash) {
    await appQuery(`update usuario set senha_hash = $2 where id = $1`, [id, senhaHash]);
    // Trocar a senha derruba as OUTRAS sessões: quem tinha o cookie antigo (ou
    // roubado) perde o acesso; só a sessão atual, que provou saber a senha, fica.
    await encerrarOutrasSessoes(id, await tokenAtual());
  }
  if (removerFoto) {
    await appQuery(`delete from usuario_avatar where usuario_id = $1`, [id]);
  } else if (avatar) {
    await appQuery(
      `insert into usuario_avatar (usuario_id, mime, bytes, atualizado_em)
       values ($1, $2, $3, now())
       on conflict (usuario_id) do update
         set mime = excluded.mime, bytes = excluded.bytes, atualizado_em = now()`,
      [id, avatar.mime, avatar.bytes]
    );
  }

  revalidatePath("/perfil");
  return { ok: "Perfil atualizado" };
}

/**
 * Encerra todas as sessões ABERTAS menos a atual — o botão "sair dos outros
 * dispositivos". Alvo é sempre a própria sessão (nunca um id do form).
 */
export async function encerrarSessoes(_prev: PerfilState, _formData: FormData): Promise<PerfilState> {
  const sessao = await getSessao();
  const n = await encerrarOutrasSessoes(sessao.usuario.id, await tokenAtual());
  revalidatePath("/perfil");
  if (n === 0) return { ok: "Nenhuma outra sessão aberta" };
  return { ok: n === 1 ? "1 outra sessão encerrada" : `${n} outras sessões encerradas` };
}
