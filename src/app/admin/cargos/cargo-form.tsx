"use client";

import { useState } from "react";
import { PermissaoMatriz, type NivelForm } from "@/components/admin/permissao-matriz";
import { salvarCargo, excluirCargo } from "../actions";
import type { CargoDetalhe, SetorOpcao, GrupoResumo } from "../dados";

const input =
  "h-10 rounded-lg border border-hairline bg-surface px-3 text-sm text-ink outline-none placeholder:text-muted focus:border-ent/50";
const check = "size-4 accent-[var(--ent)]";

/**
 * Cria ou edita um cargo (grupo de permissão): identidade, setor, as seções que
 * concede e os grupos de empresa que traz. É o molde herdado pelos usuários.
 */
export function CargoForm({
  cargo,
  setores,
  grupos,
}: {
  cargo: CargoDetalhe | null;
  setores: SetorOpcao[];
  grupos: GrupoResumo[];
}) {
  const [escolha, setEscolha] = useState<Record<string, NivelForm>>(() => ({ ...(cargo?.secoes ?? {}) }));

  return (
    <form action={salvarCargo} className="flex flex-col gap-6">
      {cargo && <input type="hidden" name="id" value={cargo.id} />}

      <section className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-ink-2">Nome do cargo</span>
          <input name="nome" required defaultValue={cargo?.nome ?? ""} className={input} placeholder="Ex.: Analista Contábil" />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-ink-2">Setor</span>
          <select name="setor_id" defaultValue={cargo?.setor_id ?? ""} className={input}>
            <option value="">Sem setor</option>
            {setores.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nome}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5 sm:col-span-2">
          <span className="text-xs font-medium text-ink-2">Descrição (opcional)</span>
          <input name="descricao" defaultValue={cargo?.descricao ?? ""} className={input} placeholder="Para que serve este cargo" />
        </label>
      </section>

      <section>
        <h2 className="text-sm font-semibold">Permissões por seção</h2>
        <p className="mt-0.5 text-xs text-muted">
          O que este cargo concede. Quem tiver o cargo herda estas seções (com ajustes por pessoa,
          se preciso).
        </p>
        <div className="mt-3">
          <PermissaoMatriz
            valor={escolha}
            onChange={(chave, nivel) => setEscolha((p) => ({ ...p, [chave]: nivel }))}
          />
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold">Grupos de empresa</h2>
        <p className="mt-0.5 text-xs text-muted">Escopo de empresa que o cargo traz para o usuário.</p>
        <div className="card mt-3 max-h-56 max-w-md divide-y divide-hairline overflow-auto">
          {grupos.length === 0 && <p className="px-4 py-3 text-xs text-muted">Nenhum grupo criado.</p>}
          {grupos.map((g) => (
            <label key={g.id} className="flex items-center gap-2.5 px-4 py-2.5 text-sm">
              <input
                type="checkbox"
                name="grupos"
                value={g.id}
                defaultChecked={cargo?.grupos.includes(g.id) ?? false}
                className={check}
              />
              <span className="min-w-0 truncate">{g.nome}</span>
              <span className="ml-auto shrink-0 text-xs text-muted">{g.empresas} empresas</span>
            </label>
          ))}
        </div>
      </section>

      <div className="flex items-center justify-between border-t border-hairline pt-4">
        {cargo ? (
          <button
            type="submit"
            formAction={excluirCargo}
            className="h-9 rounded-lg border border-critical/40 px-3 text-sm font-medium text-critical transition-colors hover:bg-critical/10"
          >
            Excluir
          </button>
        ) : (
          <span />
        )}
        <button
          type="submit"
          className="h-10 rounded-lg bg-ent px-4 text-sm font-semibold text-white transition-opacity hover:opacity-90"
        >
          {cargo ? "Salvar" : "Criar cargo"}
        </button>
      </div>
    </form>
  );
}
