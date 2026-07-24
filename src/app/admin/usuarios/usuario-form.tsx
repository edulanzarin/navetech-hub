"use client";

import { useMemo, useState } from "react";
import { MODULOS, secoesDoModulo } from "@/lib/modulos";
import { PermissaoMatriz, type NivelForm } from "@/components/admin/permissao-matriz";
import { EmpresaPicker } from "@/components/admin/empresa-picker";
import { ComboCriavel } from "@/components/ui/combo-criavel";
import { salvarUsuario, excluirUsuario } from "../actions";
import type { UsuarioDetalhe, CargoOpcao, GrupoResumo, EmpresaOpcao } from "../dados";
import { AvatarCampo } from "./avatar-campo";

const input =
  "h-10 rounded-lg border border-hairline bg-surface px-3 text-sm text-ink outline-none placeholder:text-muted focus:border-ent/50";
const check = "size-4 accent-[var(--ent)]";

/** Todas as chaves "modulo/secao" dos módulos ativos — para recalcular a matriz. */
const TODAS_SECOES: string[] = MODULOS.filter((m) => m.ativo).flatMap((m) =>
  secoesDoModulo(m.id).map((s) => `${m.id}/${s.id}`)
);

/**
 * Cria ou edita um usuário. O CARGO é a base (traz seções e grupos); a matriz
 * abaixo é o AJUSTE individual por cima do cargo (só o que difere vira exceção).
 * Admin tem acesso total — a matriz é ignorada para ele. Form client sobre Server
 * Action; a checagem admin mora na action.
 */
export function UsuarioForm({
  usuario,
  cargos,
  grupos,
  empresas,
}: {
  usuario: UsuarioDetalhe | null;
  cargos: CargoOpcao[];
  grupos: GrupoResumo[];
  empresas: EmpresaOpcao[];
}) {
  const [cargoId, setCargoId] = useState<string>(usuario?.cargo_id ? String(usuario.cargo_id) : "");
  const cargo = useMemo(() => cargos.find((c) => String(c.id) === cargoId) ?? null, [cargos, cargoId]);
  const base = cargo?.secoes ?? {};

  // Efetivo inicial = base do cargo + overrides do usuário (override vence).
  const [escolha, setEscolha] = useState<Record<string, NivelForm>>(() => {
    const eff: Record<string, NivelForm> = { ...(usuario ? {} : {}) };
    const c = cargos.find((x) => x.id === usuario?.cargo_id);
    if (c) for (const [k, v] of Object.entries(c.secoes)) eff[k] = v;
    if (usuario) for (const [k, v] of Object.entries(usuario.overrides)) eff[k] = v;
    return eff;
  });
  // Seções que o admin mexeu à mão: não são resetadas ao trocar de cargo.
  const [tocado, setTocado] = useState<Set<string>>(new Set());

  const [admin, setAdmin] = useState(usuario?.admin ?? false);

  const trocarCargo = (novo: string) => {
    setCargoId(novo);
    const c = cargos.find((x) => String(x.id) === novo) ?? null;
    setEscolha((prev) => {
      const next: Record<string, NivelForm> = {};
      for (const k of TODAS_SECOES) {
        if (tocado.has(k)) next[k] = prev[k] ?? "none";
        else next[k] = c?.secoes[k] ?? "none";
      }
      return next;
    });
  };

  const mudarSecao = (chave: string, nivel: NivelForm) => {
    setTocado((prev) => new Set(prev).add(chave));
    setEscolha((prev) => ({ ...prev, [chave]: nivel }));
  };

  return (
    <form action={salvarUsuario} className="flex flex-col gap-6">
      {usuario && <input type="hidden" name="id" value={usuario.id} />}

      <AvatarCampo
        id={usuario?.id ?? "novo"}
        nome={usuario?.nome ?? ""}
        temFoto={usuario ? usuario.avatarVersao != null : false}
        versao={usuario?.avatarVersao ?? null}
      />

      <section className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-ink-2">Nome</span>
          <input name="nome" required defaultValue={usuario?.nome ?? ""} className={input} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-ink-2">Email</span>
          <input name="email" type="email" required defaultValue={usuario?.email ?? ""} className={input} />
        </label>
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-ink-2">Cargo</span>
          <ComboCriavel
            name="cargo"
            criavel={false}
            opcoes={cargos.map((c) => ({
              id: c.id,
              nome: c.setorNome ? `${c.nome} · ${c.setorNome}` : c.nome,
            }))}
            inicial={
              usuario?.cargo_id != null
                ? {
                    id: usuario.cargo_id,
                    nome: usuario.setorNome ? `${usuario.cargoNome} · ${usuario.setorNome}` : usuario.cargoNome ?? "",
                  }
                : null
            }
            placeholder="Buscar cargo…"
            onChange={(sel) => trocarCargo(sel ? String(sel.id) : "")}
          />
        </div>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-ink-2">Telefone</span>
          <input name="telefone" defaultValue={usuario?.telefone ?? ""} className={input} placeholder="(00) 00000-0000" />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-ink-2">
            Senha {usuario && <span className="text-muted">(deixe em branco para manter)</span>}
          </span>
          <input
            name="senha"
            type="password"
            autoComplete="new-password"
            required={!usuario}
            className={input}
            placeholder="••••••••"
          />
        </label>
      </section>

      <section className="flex flex-wrap gap-5">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="ativo" defaultChecked={usuario ? usuario.ativo : true} className={check} />
          Ativo
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="admin"
            checked={admin}
            onChange={(e) => setAdmin(e.target.checked)}
            className={check}
          />
          Administrador
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="todas_empresas"
            defaultChecked={usuario?.todas_empresas ?? false}
            className={check}
          />
          Vê todas as empresas
        </label>
      </section>

      {admin ? (
        <p className="card px-4 py-3 text-sm text-muted">
          Administrador tem acesso total — cargo, seções e empresas abaixo são ignorados para ele.
        </p>
      ) : (
        <>
          <section>
            <h2 className="text-sm font-semibold">Acesso por seção</h2>
            <p className="mt-0.5 text-xs text-muted">
              A base vem do cargo. Marque abaixo só as <strong>exceções</strong> desta pessoa —
              &quot;Sem acesso&quot; numa seção do cargo <strong>remove</strong> o acesso dela.
            </p>
            <div className="mt-3">
              <PermissaoMatriz valor={escolha} onChange={mudarSecao} base={base} />
            </div>
          </section>

          <section className="grid gap-5 sm:grid-cols-2">
            <div>
              <h2 className="text-sm font-semibold">Grupos de empresa</h2>
              <p className="mt-0.5 text-xs text-muted">
                Somam ao que o cargo já concede. Ignorados se &quot;vê todas&quot; estiver marcado.
              </p>
              <div className="card mt-3 max-h-56 divide-y divide-hairline overflow-auto">
                {grupos.length === 0 && (
                  <p className="px-4 py-3 text-xs text-muted">Nenhum grupo criado.</p>
                )}
                {grupos.map((g) => {
                  const noCargo = cargo?.grupos.includes(g.id) ?? false;
                  return (
                    <label key={g.id} className="flex items-center gap-2.5 px-4 py-2.5 text-sm">
                      <input
                        type="checkbox"
                        name="grupos"
                        value={g.id}
                        defaultChecked={usuario?.grupos.includes(g.id) ?? false}
                        className={check}
                      />
                      <span className="min-w-0 truncate">{g.nome}</span>
                      {noCargo && (
                        <span className="shrink-0 rounded bg-surface-2 px-1.5 py-0.5 text-[10px] text-muted">
                          no cargo
                        </span>
                      )}
                      <span className="ml-auto shrink-0 text-xs text-muted">{g.empresas} empresas</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div>
              <h2 className="text-sm font-semibold">Empresas avulsas</h2>
              <p className="mt-0.5 text-xs text-muted">Extras além dos grupos.</p>
              <div className="mt-3">
                <EmpresaPicker name="empresas" empresas={empresas} inicial={usuario?.empresas ?? []} />
              </div>
            </div>
          </section>
        </>
      )}

      <div className="flex items-center justify-between border-t border-hairline pt-4">
        {usuario ? (
          <button
            type="submit"
            formAction={excluirUsuario}
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
          {usuario ? "Salvar" : "Criar usuário"}
        </button>
      </div>
    </form>
  );
}
