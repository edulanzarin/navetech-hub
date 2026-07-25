"use client";

import { Modal } from "@/components/ui/modal";
import { useFicha } from "@/hooks/use-api";
import { dataBR } from "@/lib/format";

/** Dias → "X anos Y meses" / "N meses" / "N dias". */
export function tempoCasa(dias: number | null): string {
  if (dias == null) return "—";
  if (dias < 30) return `${dias} ${dias === 1 ? "dia" : "dias"}`;
  const meses = Math.floor(dias / 30);
  if (meses < 12) return `${meses} ${meses === 1 ? "mês" : "meses"}`;
  const anos = Math.floor(meses / 12);
  const resto = meses % 12;
  return resto ? `${anos}a ${resto}m` : `${anos} ${anos === 1 ? "ano" : "anos"}`;
}

function Campo({ rotulo, valor }: { rotulo: string; valor: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-muted">{rotulo}</p>
      <p className="mt-0.5 text-sm text-ink">{valor || "—"}</p>
    </div>
  );
}

/** Ficha completa de um colaborador em modal — abre a partir de qualquer lista. */
export function FichaModal({
  empresa,
  contrato,
  onFechar,
  modulo = "folha",
}: {
  empresa: number | null;
  contrato: number | null;
  onFechar: () => void;
  /** Rota da ficha: Folha (padrão) ou RH. A ficha é a mesma; muda só o gate. */
  modulo?: "folha" | "rh";
}) {
  const { data: f, isLoading } = useFicha(empresa, contrato, modulo);
  return (
    <Modal
      aberto={contrato != null}
      onFechar={onFechar}
      largura="max-w-2xl"
      titulo={f ? f.nome : "Colaborador"}
      subtitulo={f ? `${f.cargo ?? "—"} · contrato ${f.contrato}` : undefined}
    >
      <div className="overflow-y-auto px-6 py-5">
        {isLoading || !f ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="skeleton h-16 w-full" />
            ))}
          </div>
        ) : (
          <div className="space-y-6">
            <section>
              <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-2">Pessoa</h4>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                <Campo rotulo="CPF" valor={f.cpf} />
                <Campo rotulo="Sexo" valor={f.sexo} />
                <Campo rotulo="Idade" valor={f.idade != null ? `${f.idade} anos` : "—"} />
                <Campo rotulo="Nascimento" valor={dataBR(f.nascimento)} />
                <Campo rotulo="Escolaridade" valor={f.escolaridade} />
                <Campo
                  rotulo="Cidade"
                  valor={f.cidade ? `${f.cidade}${f.uf ? `/${f.uf}` : ""}` : "—"}
                />
              </div>
            </section>

            <section>
              <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-2">Vínculo</h4>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                <Campo rotulo="Cargo" valor={f.cargo} />
                <Campo rotulo="Função" valor={f.funcao} />
                <Campo rotulo="Setor" valor={f.setor} />
                <Campo rotulo="Estabelecimento" valor={f.estabelecimento} />
                <Campo
                  rotulo="Salário"
                  valor={
                    f.salario != null
                      ? `${f.salario.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}${f.tipoSalario ? ` · ${f.tipoSalario}` : ""}`
                      : "—"
                  }
                />
                <Campo
                  rotulo="Categoria / tipo"
                  valor={`${f.categoria ?? "—"} / ${f.tipoVinculo ?? "—"}`}
                />
              </div>
            </section>

            <section>
              <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-2">Contrato</h4>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                <Campo rotulo="Admissão" valor={dataBR(f.dataadm)} />
                <Campo rotulo="Desligamento" valor={f.datadem ? dataBR(f.datadem) : "ativo"} />
                <Campo rotulo="Tempo de casa" valor={tempoCasa(f.tempoCasaDias)} />
                {f.motivoDesligamento && (
                  <div className="col-span-2 sm:col-span-3">
                    <Campo rotulo="Motivo do desligamento" valor={f.motivoDesligamento} />
                  </div>
                )}
              </div>
            </section>
          </div>
        )}
      </div>
    </Modal>
  );
}
