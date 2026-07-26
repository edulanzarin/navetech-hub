"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { AvatarCampo } from "@/app/admin/usuarios/avatar-campo";
import { atualizarPerfil, type PerfilState } from "./actions";

const input =
  "h-10 rounded-lg border border-hairline bg-surface px-3 text-sm text-ink outline-none placeholder:text-muted focus:border-ent/50";
const INICIAL: PerfilState = {};

/**
 * Edição do próprio perfil: foto e senha. Nome e email aparecem só para leitura
 * (quem muda cadastro é o admin). Form client sobre a Server Action, que é quem
 * decide o alvo pela sessão — o form não carrega id de usuário.
 */
export function PerfilForm({
  id,
  nome,
  email,
  avatarVersao,
}: {
  id: string;
  nome: string;
  email: string;
  avatarVersao: number | null;
}) {
  const [state, action, pending] = useActionState(atualizarPerfil, INICIAL);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) {
      toast.success(state.ok);
      // Limpa os campos de senha; a foto já foi persistida e re-renderizada.
      formRef.current?.querySelectorAll<HTMLInputElement>("input[type=password]").forEach((i) => {
        i.value = "";
      });
    } else if (state.erro) {
      toast.error(state.erro);
    }
  }, [state]);

  return (
    <form ref={formRef} action={action} className="flex flex-col gap-8">
      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-semibold">Foto de perfil</h2>
        <AvatarCampo id={id} nome={nome} temFoto={avatarVersao != null} versao={avatarVersao} />
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-ink-2">Nome</span>
          <p className={`${input} flex items-center bg-surface-2 text-muted`}>{nome}</p>
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-ink-2">Email</span>
          <p className={`${input} flex items-center bg-surface-2 text-muted`}>{email}</p>
        </div>
        <p className="text-xs text-muted sm:col-span-2">
          Nome e email são definidos pela administração e não podem ser alterados aqui.
        </p>
      </section>

      <section className="flex flex-col gap-4">
        <div>
          <h2 className="text-sm font-semibold">Trocar senha</h2>
          <p className="mt-0.5 text-xs text-muted">
            Deixe em branco para manter a senha atual.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5 sm:col-span-2 sm:max-w-[calc(50%-0.5rem)]">
            <span className="text-xs font-medium text-ink-2">Senha atual</span>
            <input name="senha_atual" type="password" autoComplete="current-password" className={input} placeholder="••••••••" />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-ink-2">Nova senha</span>
            <input name="senha_nova" type="password" autoComplete="new-password" className={input} placeholder="Ao menos 8 caracteres" />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-ink-2">Confirmar nova senha</span>
            <input name="senha_confirma" type="password" autoComplete="new-password" className={input} placeholder="Repita a nova senha" />
          </label>
        </div>
      </section>

      <div className="flex justify-end border-t border-hairline pt-4">
        <button
          type="submit"
          disabled={pending}
          className="h-10 rounded-lg bg-ent px-4 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {pending ? "Salvando…" : "Salvar"}
        </button>
      </div>
    </form>
  );
}
