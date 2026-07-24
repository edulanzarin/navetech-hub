"use client";

import { MODULOS, secoesDoModulo } from "@/lib/modulos";

export type NivelForm = "none" | "view" | "edit";

const check = "size-4 accent-[var(--ent)]";

const ROTULO: Record<NivelForm, string> = { none: "Sem acesso", view: "Ver", edit: "Editar" };

/**
 * Matriz de permissão por seção (none/view/edit), controlada pelo pai. Usada
 * tanto para DEFINIR um cargo quanto para AJUSTAR um usuário por cima do cargo.
 *
 * Quando `base` é passado (o que o cargo concede), cada seção mostra a herança e
 * marca visualmente as células que divergem do cargo — assim o admin enxerga o
 * que é herdado e o que é exceção. Os rádios usam `name="sec:<modulo>:<secao>"`,
 * então o form nativo já envia a escolha (sem inputs escondidos).
 */
export function PermissaoMatriz({
  valor,
  onChange,
  base,
}: {
  valor: Record<string, NivelForm>;
  onChange: (chave: string, nivel: NivelForm) => void;
  base?: Record<string, "view" | "edit">;
}) {
  const modulos = MODULOS.filter((m) => m.ativo);

  return (
    <div className="flex flex-col gap-5">
      {modulos.map((m) => (
        <div key={m.id}>
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted">
            {m.titulo}
          </p>
          <div className="card divide-y divide-hairline">
            {secoesDoModulo(m.id).map((s) => {
              const chave = `${m.id}/${s.id}`;
              const atual = valor[chave] ?? "none";
              const herdado = base?.[chave];
              const diverge = base !== undefined && atual !== (herdado ?? "none");
              return (
                <div key={s.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                  <span className="flex min-w-0 items-center gap-2 text-sm">
                    <span className="truncate">{s.rotulo}</span>
                    {base !== undefined &&
                      (herdado ? (
                        <span className="shrink-0 rounded bg-surface-2 px-1.5 py-0.5 text-[10px] text-muted">
                          cargo: {ROTULO[herdado]}
                        </span>
                      ) : (
                        <span className="shrink-0 rounded bg-surface-2 px-1.5 py-0.5 text-[10px] text-muted">
                          cargo: —
                        </span>
                      ))}
                    {diverge && (
                      <span className="shrink-0 rounded bg-ent/12 px-1.5 py-0.5 text-[10px] font-medium text-ent">
                        exceção
                      </span>
                    )}
                  </span>
                  <div className="flex shrink-0 gap-4 text-xs">
                    {(["none", "view", "edit"] as const).map((op) => (
                      <label key={op} className="flex items-center gap-1.5">
                        <input
                          type="radio"
                          name={`sec:${m.id}:${s.id}`}
                          value={op}
                          checked={atual === op}
                          onChange={() => onChange(chave, op)}
                          className={check}
                        />
                        {ROTULO[op]}
                      </label>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
