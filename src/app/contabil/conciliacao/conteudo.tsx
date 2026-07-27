"use client";

import { useMemo } from "react";
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  FileUp,
  Landmark,
  ShieldCheck,
  X,
} from "lucide-react";
import clsx from "clsx";
import { ContaDropdown } from "@/components/conta-dropdown";
import { Kpi } from "@/components/kpi-conf";
import { useEstadoSecao } from "@/hooks/use-estado-secao";
import { useFiltros } from "@/hooks/use-filters";
import { brl, dataBR, num } from "@/lib/format";
import { resumir, type Ajustes, type Previa } from "@/lib/extrato-previa";

type Filtro = "todos" | "prontos" | "pendentes";

/**
 * Exibição da importação: KPIs, consistência de saldo e lançamentos gerados.
 * Os controles (conta, extrato, senha, Executar) moram na linha da barra de
 * filtros — renderizados pelo shell — e compartilham o estado da seção com
 * esta página, então o que se escolhe lá aparece aqui na hora.
 */
export default function ImportarPage() {
  const { filtros } = useFiltros();
  const empresa = filtros.empresas[0];
  const temEmpresa = filtros.empresas.length === 1;

  // Sobrevive à ida e volta para a aba Regras — o extrato lido é trabalho, não
  // dá para pedir o arquivo de novo só porque o usuário foi cadastrar a regra.
  const [previa, setPrevia] = useEstadoSecao<Previa | null>("extrato", null);
  const [ajustes, setAjustes] = useEstadoSecao<Ajustes>("ajustes", {});
  const [filtro, setFiltro] = useEstadoSecao<Filtro>("filtro", "todos");

  function ajustar(indice: number, contaEscolhida: number | null) {
    const novos = { ...ajustes };
    if (contaEscolhida == null) delete novos[indice];
    else novos[indice] = contaEscolhida;
    setAjustes(novos);
    if (previa) setPrevia({ ...previa, resumo: resumir(previa.lancamentos, novos) });
  }

  const visiveis = useMemo(() => {
    if (!previa) return [];
    return previa.lancamentos
      .map((l, i) => ({ l, i }))
      .filter(({ l, i }) => {
        const resolvido = !l.pendencia || ajustes[i] != null;
        return filtro === "todos" ? true : filtro === "prontos" ? resolvido : !resolvido;
      });
  }, [previa, ajustes, filtro]);

  if (!temEmpresa) {
    return (
      <section className="card grid place-items-center gap-3 px-6 py-16 text-center">
        <span className="grid size-12 place-items-center rounded-2xl bg-ent/12 text-ent">
          <Building2 className="size-6" />
        </span>
        <p className="text-sm font-medium text-ink">Selecione uma empresa</p>
      </section>
    );
  }

  const r = previa?.resumo;

  if (!previa || !r) {
    return (
      <section className="card grid place-items-center gap-3 px-6 py-14 text-center">
        <span className="grid size-12 place-items-center rounded-2xl bg-surface-2 text-muted">
          <FileUp className="size-6" />
        </span>
        <p className="text-sm font-medium text-ink">Nenhum extrato processado</p>
      </section>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi
          rotulo="Transações lidas"
          icone={<FileUp className="size-4 text-ent" />}
          corIcone="bg-ent/12"
          valor={num(r.total)}
          secundario={
            previa.inicio && previa.fim
              ? `${dataBR(previa.inicio)} – ${dataBR(previa.fim)}`
              : (previa.banco ?? "")
          }
        />
        <Kpi
          rotulo="Prontas para lançar"
          icone={<CheckCircle2 className="size-4 text-good" />}
          corIcone="bg-good/12"
          valor={num(r.prontos)}
          secundario={`${((r.prontos / r.total) * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}% do extrato`}
        />
        <Kpi
          rotulo="Sem conta"
          icone={<AlertTriangle className="size-4 text-warn" />}
          corIcone="bg-warn/12"
          valor={num(r.semRegra + r.semConta)}
          secundario={
            r.semConta > 0
              ? `${num(r.semConta)} com regra mas sem conta no sentido`
              : "descrições ainda não cadastradas"
          }
          alerta={r.semRegra + r.semConta > 0}
        />
        <Kpi
          rotulo="Movimento"
          icone={<Landmark className="size-4 text-ink-2" />}
          corIcone="bg-surface-2"
          valor={brl(r.entradas + r.saidas)}
          secundario={`${brl(r.entradas)} entradas · ${brl(Math.abs(r.saidas))} saídas`}
        />
      </div>

      {previa.saldoConfere !== null && (
        <p
          className={clsx(
            "flex items-start gap-2 rounded-lg px-3 py-2 text-xs",
            previa.saldoConfere ? "bg-good/10 text-good" : "bg-warn/10 text-warn"
          )}
        >
          {previa.saldoConfere ? (
            <ShieldCheck className="mt-px size-4 shrink-0" />
          ) : (
            <AlertTriangle className="mt-px size-4 shrink-0" />
          )}
          <span>
            {previa.saldoConfere
              ? "Cadeia de saldos do extrato fecha do início ao fim — a leitura está consistente."
              : "A cadeia de saldos do extrato não fecha. Pode haver linha não lida — confira antes de usar."}
          </span>
        </p>
      )}

      <section className="card anim-fade-up p-5">
        <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold">Lançamentos gerados</h2>
            <p className="mt-0.5 text-xs text-muted">
              {previa.arquivo}
              {previa.banco ? ` · ${previa.banco}` : ""} · banco na conta{" "}
              {previa.contaBanco.conta}
            </p>
          </div>
          <div className="flex items-center gap-1">
            {(["todos", "prontos", "pendentes"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFiltro(f)}
                className={clsx(
                  "rounded-lg px-2.5 py-1.5 text-xs transition-colors",
                  filtro === f
                    ? "bg-ent/12 font-medium text-ent"
                    : "text-muted hover:bg-surface-2 hover:text-ink"
                )}
              >
                {f === "todos" ? "Todos" : f === "prontos" ? "Prontos" : "Pendentes"}
              </button>
            ))}
          </div>
        </header>

        <div className="max-h-[32rem] overflow-auto">
          <table className="w-full min-w-[880px] border-collapse text-sm">
            <thead className="sticky top-0 z-10 bg-surface">
              <tr className="border-b border-hairline text-xs text-muted">
                <th className="py-2 pr-3 text-left font-medium">Data</th>
                <th className="py-2 pr-3 text-left font-medium">Descrição no extrato</th>
                <th className="py-2 pr-3 text-left font-medium">Débito</th>
                <th className="py-2 pr-3 text-left font-medium">Crédito</th>
                <th className="py-2 pl-3 text-right font-medium">Valor</th>
              </tr>
            </thead>
            <tbody>
              {visiveis.map(({ l, i }) => {
                const ajuste = ajustes[i] ?? null;
                const pendente = !!l.pendencia && ajuste == null;
                // O ajuste entra no lado que a contrapartida ocupa.
                const debito =
                  l.contaDebito ?? (l.sentido === "pagamento" ? ajuste : l.contaDebito);
                const credito =
                  l.contaCredito ?? (l.sentido === "recebimento" ? ajuste : l.contaCredito);

                return (
                  <tr
                    key={i}
                    className="border-b border-hairline/60 align-top last:border-0 hover:bg-surface-2/50"
                  >
                    <td className="whitespace-nowrap py-2.5 pr-3 tabular-nums text-ink-2">
                      {dataBR(l.data)}
                    </td>
                    <td className="max-w-[340px] py-2.5 pr-3">
                      <span className="block truncate text-ink" title={l.descricao}>
                        {l.descricao}
                      </span>
                      {pendente && (
                        <span className="mt-0.5 inline-block rounded bg-warn/12 px-1.5 py-0.5 text-[10px] font-medium text-warn">
                          {l.pendencia === "sem_regra"
                            ? "Sem regra cadastrada"
                            : `Regra não define conta para ${l.sentido}`}
                        </span>
                      )}
                      {ajuste != null && (
                        <span className="mt-0.5 inline-flex items-center gap-1 rounded bg-ent/12 px-1.5 py-0.5 text-[10px] font-medium text-ent">
                          Conta escolhida à mão
                          <button
                            onClick={() => ajustar(i, null)}
                            title="Desfazer"
                            className="hover:text-ink"
                          >
                            <X className="size-3" />
                          </button>
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 pr-3 tabular-nums">
                      {l.sentido === "pagamento" && l.contaDebito == null ? (
                        <ContaDropdown
                          empresa={empresa}
                          valor={ajuste}
                          onMudar={(c) => ajustar(i, c)}
                          placeholder="escolher"
                          limpavel
                          largura="w-96"
                        />
                      ) : (
                        (debito ?? <span className="text-muted">—</span>)
                      )}
                    </td>
                    <td className="py-2.5 pr-3 tabular-nums">
                      {l.sentido === "recebimento" && l.contaCredito == null ? (
                        <ContaDropdown
                          empresa={empresa}
                          valor={ajuste}
                          onMudar={(c) => ajustar(i, c)}
                          placeholder="escolher"
                          limpavel
                          largura="w-96"
                        />
                      ) : (
                        (credito ?? <span className="text-muted">—</span>)
                      )}
                    </td>
                    <td
                      className={clsx(
                        "py-2.5 pl-3 text-right font-semibold tabular-nums",
                        l.sentido === "recebimento" ? "text-good" : "text-ink"
                      )}
                    >
                      {l.sentido === "recebimento" ? "+" : "−"} {brl(l.valor)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
