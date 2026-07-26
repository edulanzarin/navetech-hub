"use client";

import { MODULOS, secoesDoModulo } from "@/lib/modulos";

const check = "size-4 accent-[var(--ent)]";

/**
 * Matriz de permissão por seção — BINÁRIA: cada seção é liberada ou não. Usada
 * tanto para DEFINIR um cargo quanto para AJUSTAR um usuário por cima do cargo.
 *
 * Quando `base` é passado (as seções que o cargo concede), cada linha mostra a
 * herança e marca as que divergem do cargo como "exceção" — o admin enxerga o
 * que é herdado e o que é ajuste. Os checkboxes usam `name="sec:<modulo>:<secao>"`,
 * então o form nativo já envia a escolha (presente = liberado).
 */
export function PermissaoMatriz({
  valor,
  onChange,
  base,
}: {
  valor: Record<string, boolean>;
  onChange: (chave: string, liberado: boolean) => void;
  base?: Set<string>;
}) {
  const modulos = MODULOS;

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
              const liberado = !!valor[chave];
              const noCargo = base?.has(chave);
              const diverge = base !== undefined && liberado !== !!noCargo;
              return (
                <label
                  key={s.id}
                  className="flex cursor-pointer items-center justify-between gap-3 px-4 py-2.5"
                >
                  <span className="flex min-w-0 items-center gap-2 text-sm">
                    <span className="truncate">{s.rotulo}</span>
                    {base !== undefined && (
                      <span className="shrink-0 rounded bg-surface-2 px-1.5 py-0.5 text-[10px] text-muted">
                        cargo: {noCargo ? "sim" : "—"}
                      </span>
                    )}
                    {diverge && (
                      <span className="shrink-0 rounded bg-ent/12 px-1.5 py-0.5 text-[10px] font-medium text-ent">
                        exceção
                      </span>
                    )}
                  </span>
                  <input
                    type="checkbox"
                    name={`sec:${m.id}:${s.id}`}
                    checked={liberado}
                    onChange={(e) => onChange(chave, e.target.checked)}
                    className={`${check} shrink-0`}
                  />
                </label>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
