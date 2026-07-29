"use client";

import { useMemo, useState } from "react";
import { Building2, CheckCircle2, AlertTriangle, Layers, Printer } from "lucide-react";
import clsx from "clsx";
import { useFiltros } from "@/hooks/use-filters";
import { useBalanceteContabil } from "@/hooks/use-api";
import { brl, dataBR, num } from "@/lib/format";
import type { BalanceteContabilLinha, BalanceteContabilResp } from "@/lib/types";

/** Valor com natureza: magnitude + letra D/C (como o Questor imprime). */
function SaldoCel({ v, forte }: { v: number; forte?: boolean }) {
  if (Math.abs(v) < 0.005) return <span className="text-muted/40">—</span>;
  return (
    <span className={clsx("tabular-nums", forte && "font-medium")}>
      {brl(Math.abs(v))} <span className="text-[10px] text-muted">{v >= 0 ? "D" : "C"}</span>
    </span>
  );
}

/** Movimento (débito/crédito): magnitude simples; zero vira travessão. */
function MovCel({ v, forte }: { v: number; forte?: boolean }) {
  if (Math.abs(v) < 0.005) return <span className="text-muted/40">—</span>;
  return <span className={clsx("tabular-nums text-ink", forte && "font-medium")}>{brl(v)}</span>;
}

export default function BalanceteContabilPage() {
  const { filtros, qs } = useFiltros();
  const temEmpresa = filtros.empresas.length === 1;
  const [nivel, setNivel] = useState(3);

  const bal = useBalanceteContabil(qs, temEmpresa);
  const dados = bal.data;
  const nivelMax = dados?.nivelMax ?? 5;

  const linhas = useMemo(
    () => (dados?.linhas ?? []).filter((l) => l.nivel <= nivel),
    [dados, nivel]
  );

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

  if (bal.isError) {
    return (
      <section className="card grid place-items-center gap-3 px-6 py-16 text-center">
        <span className="grid size-12 place-items-center rounded-2xl bg-critical/12 text-critical">
          <AlertTriangle className="size-6" />
        </span>
        <p className="text-sm font-medium text-ink">Não foi possível montar o balancete</p>
        <p className="max-w-md text-xs text-muted">
          {bal.error instanceof Error ? bal.error.message : "Tente novamente em instantes."}
        </p>
      </section>
    );
  }

  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `@media print {
            body * { visibility: hidden !important; }
            #bal-print, #bal-print * { visibility: visible !important; }
            #bal-print { position: absolute; inset: 0; padding: 0; }
            .no-print { display: none !important; }
            #bal-print .max-h-\\[40rem\\] { max-height: none !important; overflow: visible !important; }
          }`,
        }}
      />
      <section id="bal-print" className="card anim-fade-up p-5">
        <Cabecalho dados={dados} nivel={nivel} nivelMax={nivelMax} onNivel={setNivel} />

        {bal.isLoading || !dados ? (
          <div className="skeleton h-96 w-full" />
        ) : linhas.length === 0 ? (
          <p className="grid h-32 place-items-center text-sm text-muted">Sem movimento no período.</p>
        ) : (
          <div className={clsx(bal.isFetching && !bal.isLoading && "refetching")}>
            <div className="max-h-[40rem] overflow-auto rounded-xl border border-hairline">
              <table className="w-full min-w-[820px] border-collapse text-sm">
                <thead className="sticky top-0 z-10 bg-surface">
                  <tr className="border-b border-hairline text-[10px] uppercase tracking-wide text-muted">
                    <th className="py-2 pl-3 pr-3 text-left font-medium">Conta</th>
                    <th className="border-l border-hairline py-2 pl-3 pr-3 text-right font-medium">
                      Saldo anterior
                    </th>
                    <th className="border-l border-hairline py-2 pl-3 pr-3 text-right font-medium">Débito</th>
                    <th className="py-2 pr-3 text-right font-medium">Crédito</th>
                    <th className="border-l border-hairline py-2 pl-3 pr-3 text-right font-medium">
                      Saldo atual
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {linhas.map((l) => (
                    <Linha key={`${l.classif}-${l.conta}`} l={l} />
                  ))}
                </tbody>
                <Totais dados={dados} />
              </table>
            </div>
          </div>
        )}
      </section>
    </>
  );
}

function Cabecalho({
  dados,
  nivel,
  nivelMax,
  onNivel,
}: {
  dados: BalanceteContabilResp | undefined;
  nivel: number;
  nivelMax: number;
  onNivel: (n: number) => void;
}) {
  return (
    <header className="mb-4 flex flex-wrap items-start justify-between gap-3 border-b border-hairline pb-4">
      <div className="min-w-0">
        <h2 className="text-sm font-semibold text-ink">
          {dados ? dados.empresa.nome : "Balancete de verificação"}
        </h2>
        <p className="mt-0.5 text-xs text-muted">
          {dados ? (
            <>
              {dados.empresa.cnpj ? `CNPJ ${dados.empresa.cnpj} · ` : ""}
              {dataBR(dados.periodo.inicio)} – {dataBR(dados.periodo.fim)} ·{" "}
              {num(dados.linhas.filter((l) => !l.sintetica).length)} contas com saldo ou movimento
            </>
          ) : (
            "Saldo anterior, movimento do período e saldo atual, por conta"
          )}
        </p>
      </div>
      <div className="no-print flex items-center gap-2">
        <span className="flex items-center gap-1.5 text-xs text-muted">
          <Layers className="size-3.5" /> Nível
        </span>
        <div className="flex rounded-lg border border-hairline bg-surface-2 p-0.5 text-xs">
          {Array.from({ length: nivelMax }, (_, i) => i + 1).map((n) => (
            <button
              key={n}
              onClick={() => onNivel(n)}
              className={clsx(
                "rounded-md px-2.5 py-1 tabular-nums transition-colors",
                nivel === n ? "bg-surface font-medium text-ink shadow-sm" : "text-muted hover:text-ink"
              )}
            >
              {n}
            </button>
          ))}
        </div>
        <button
          onClick={() => window.print()}
          disabled={!dados}
          className="inline-flex items-center gap-1.5 rounded-lg border border-hairline bg-surface-2 px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:bg-surface disabled:opacity-50"
        >
          <Printer className="size-3.5" /> Exportar PDF
        </button>
      </div>
    </header>
  );
}

function Linha({ l }: { l: BalanceteContabilLinha }) {
  const indent = Math.max(0, l.nivel - 1) * 14;
  return (
    <tr className={clsx("border-b border-hairline/50 last:border-0", l.sintetica && "bg-surface-2/30")}>
      <td className="py-1.5 pl-3 pr-3">
        <div style={{ paddingLeft: indent }} className="flex items-baseline gap-2">
          <span className={clsx("shrink-0 tabular-nums text-[11px] text-muted")}>{l.classif}</span>
          <span className={clsx("truncate", l.sintetica ? "font-medium text-ink" : "text-ink-2")}>
            {l.descricao}
          </span>
        </div>
      </td>
      <td className="border-l border-hairline/40 py-1.5 pl-3 pr-3 text-right">
        <SaldoCel v={l.saldoAnterior} forte={l.sintetica} />
      </td>
      <td className="border-l border-hairline/40 py-1.5 pl-3 pr-3 text-right">
        <MovCel v={l.debito} forte={l.sintetica} />
      </td>
      <td className="py-1.5 pr-3 text-right">
        <MovCel v={l.credito} forte={l.sintetica} />
      </td>
      <td className="border-l border-hairline/40 py-1.5 pl-3 pr-3 text-right">
        <SaldoCel v={l.saldoAtual} forte={l.sintetica} />
      </td>
    </tr>
  );
}

function Totais({ dados }: { dados: BalanceteContabilResp }) {
  const t = dados.totais;
  return (
    <tfoot className="sticky bottom-0 z-10 bg-surface">
      <tr className="border-t-2 border-hairline text-xs font-semibold text-ink">
        <td className="py-2 pl-3 pr-3">
          <span className="inline-flex items-center gap-1.5">
            {t.fecha ? (
              <CheckCircle2 className="size-3.5 text-good" />
            ) : (
              <AlertTriangle className="size-3.5 text-critical" />
            )}
            Totais das analíticas {t.fecha ? "· fecha" : "· NÃO fecha"}
          </span>
        </td>
        <td className="border-l border-hairline py-2 pl-3 pr-3 text-right tabular-nums">
          {brl(t.saldoAnteriorDevedor)} D · {brl(t.saldoAnteriorCredor)} C
        </td>
        <td className="border-l border-hairline py-2 pl-3 pr-3 text-right tabular-nums">{brl(t.debito)}</td>
        <td className="py-2 pr-3 text-right tabular-nums">{brl(t.credito)}</td>
        <td className="border-l border-hairline py-2 pl-3 pr-3 text-right tabular-nums">
          {brl(t.saldoAtualDevedor)} D · {brl(t.saldoAtualCredor)} C
        </td>
      </tr>
    </tfoot>
  );
}
