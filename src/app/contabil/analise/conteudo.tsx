"use client";

import { useState } from "react";
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  FileDown,
  Loader2,
  Minus,
  Sparkles,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import clsx from "clsx";
import { useFiltros } from "@/hooks/use-filters";
import { useAnaliseBalancete, useLaudoEscrito } from "@/hooks/use-api";
import { brl, brlCompact, dataBR, mesBR, num } from "@/lib/format";
import type {
  AnaliseBalanceteResp,
  AnaliseDeterministica,
  IndicadorCalc,
  Inconsistencia,
} from "@/lib/types";

const SAUDE: Record<AnaliseDeterministica["saudeGeral"], { rotulo: string; classe: string }> = {
  forte: { rotulo: "Saúde forte", classe: "bg-good/12 text-good" },
  estavel: { rotulo: "Estável", classe: "bg-ent/12 text-ent" },
  atencao: { rotulo: "Requer atenção", classe: "bg-warning/12 text-warn" },
  critica: { rotulo: "Crítica", classe: "bg-critical/12 text-critical" },
};

const FAIXA: Record<IndicadorCalc["faixa"], string> = {
  bom: "text-good",
  atencao: "text-warn",
  ruim: "text-critical",
  neutro: "text-muted",
};

const SEVERIDADE: Record<Inconsistencia["severidade"], string> = {
  alta: "border-critical/40 bg-critical/8",
  media: "border-warning/40 bg-warning/8",
  baixa: "border-hairline bg-surface-2",
};

function Tendencia({ t }: { t: IndicadorCalc["tendencia"] }) {
  if (t === "melhora") return <TrendingUp className="size-3.5 text-good" />;
  if (t === "piora") return <TrendingDown className="size-3.5 text-critical" />;
  if (t === "estavel") return <Minus className="size-3.5 text-muted" />;
  return null;
}

export default function AnaliseBalancetePage() {
  const { filtros, qs } = useFiltros();
  const temEmpresa = filtros.empresas.length === 1;
  const q = useAnaliseBalancete(qs, temEmpresa);
  const dados = q.data;

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

  if (q.isLoading || (q.isFetching && !dados)) {
    return (
      <section className="card grid place-items-center gap-4 px-6 py-20 text-center">
        <Loader2 className="size-6 animate-spin text-ent" />
        <p className="text-sm text-muted">Coletando os saldos e aplicando as regras…</p>
      </section>
    );
  }

  if (q.isError || !dados) {
    return (
      <section className="card grid place-items-center gap-3 px-6 py-16 text-center">
        <span className="grid size-12 place-items-center rounded-2xl bg-critical/12 text-critical">
          <AlertTriangle className="size-6" />
        </span>
        <p className="text-sm font-medium text-ink">Não foi possível gerar a análise</p>
        <p className="max-w-md text-xs text-muted">
          {q.error instanceof Error ? q.error.message : "Tente novamente em instantes."}
        </p>
      </section>
    );
  }

  return <Laudo dados={dados} qs={qs} temEmpresa={temEmpresa} />;
}

function Laudo({
  dados,
  qs,
  temEmpresa,
}: {
  dados: AnaliseBalanceteResp;
  qs: string;
  temEmpresa: boolean;
}) {
  const { analise, empresa, periodo } = dados;
  const saude = SAUDE[analise.saudeGeral] ?? SAUDE.estavel;

  const [pedirLaudo, setPedirLaudo] = useState(false);
  const laudo = useLaudoEscrito(qs, pedirLaudo && temEmpresa);

  const gruposEstrutura = analise.grupos.filter(
    (g) => g.chave !== "receita" && g.chave !== "custoDespesa"
  );

  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `@media print {
            body * { visibility: hidden !important; }
            #laudo-print, #laudo-print * { visibility: visible !important; }
            #laudo-print { position: absolute; inset: 0; padding: 0; }
            .no-print { display: none !important; }
          }`,
        }}
      />

      <section id="laudo-print" className="card anim-fade-up p-6">
        {/* Cabeçalho */}
        <header className="mb-5 flex flex-wrap items-start justify-between gap-4 border-b border-hairline pb-5">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-ent">
              <Sparkles className="size-4" />
              <span className="text-xs font-semibold uppercase tracking-wide">
                Análise de Balancete
              </span>
            </div>
            <h1 className="mt-1 text-lg font-semibold text-ink">{empresa.nome}</h1>
            <p className="text-xs text-muted">
              {empresa.cnpj ? `CNPJ ${empresa.cnpj} · ` : ""}
              {dataBR(periodo.inicio)} – {dataBR(periodo.fim)} ({periodo.meses.length}{" "}
              {periodo.meses.length === 1 ? "mês" : "meses"})
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className={clsx("rounded-full px-3 py-1 text-xs font-semibold", saude.classe)}>
              {saude.rotulo}
            </span>
            <button
              onClick={() => window.print()}
              className="no-print inline-flex items-center gap-1.5 rounded-lg border border-hairline bg-surface-2 px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:bg-surface"
            >
              <FileDown className="size-3.5" /> Exportar PDF
            </button>
          </div>
        </header>

        {/* Inconsistências / regras */}
        <Regras analise={analise} />

        {/* Indicadores */}
        {analise.indicadores.length > 0 && (
          <div className="mb-6">
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
              Indicadores
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {analise.indicadores.map((ind) => (
                <div key={ind.chave} className="rounded-xl border border-hairline bg-surface-2/40 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-muted">{ind.nome}</span>
                    <Tendencia t={ind.tendencia} />
                  </div>
                  <p className={clsx("mt-1 text-lg font-semibold tabular-nums", FAIXA[ind.faixa])}>
                    {ind.formatado}
                  </p>
                  <p className="mt-1 text-xs leading-snug text-muted">{ind.interpretacao}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Estrutura patrimonial */}
        {gruposEstrutura.length > 0 && (
          <div className="mb-6">
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
              Estrutura patrimonial (último mês)
            </h2>
            <div className="overflow-x-auto rounded-xl border border-hairline">
              <table className="w-full text-sm">
                <tbody>
                  {gruposEstrutura.map((g) => (
                    <tr key={g.chave} className="border-b border-hairline/50 last:border-0">
                      <td className="px-3 py-2 text-ink-2">{g.nome}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-ink">{brl(g.saldoFinal)}</td>
                      <td className="w-16 px-3 py-2 text-right tabular-nums text-muted">
                        {g.pctBase != null ? `${(g.pctBase * 100).toFixed(0)}%` : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Evolução mês a mês */}
        {analise.meses.length > 1 && (
          <div className="mb-6">
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
              Evolução mês a mês
            </h2>
            <div className="overflow-x-auto rounded-xl border border-hairline">
              <table className="w-full min-w-[560px] text-xs">
                <thead>
                  <tr className="border-b border-hairline text-muted">
                    <th className="px-3 py-2 text-left font-medium">Grupo</th>
                    {analise.meses.map((m) => (
                      <th key={m} className="px-2 py-2 text-right font-medium">
                        {mesBR(m + "-01")}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {analise.grupos.map((g) => (
                    <tr key={g.chave} className="border-b border-hairline/50 last:border-0">
                      <td className="px-3 py-1.5 text-ink-2">{g.nome}</td>
                      {g.serie.map((v, i) => (
                        <td key={i} className="px-2 py-1.5 text-right tabular-nums text-ink">
                          {brlCompact(v)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Laudo escrito por IA (opcional) */}
        <div className="mt-6 border-t border-hairline pt-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">
                Laudo escrito
              </h2>
              <p className="mt-0.5 text-xs text-muted">
                Redação em prosa para apresentar ao cliente — gerada por IA sobre a análise acima.
              </p>
            </div>
            {!laudo.data && (
              <button
                onClick={() => setPedirLaudo(true)}
                disabled={laudo.isFetching}
                className="no-print inline-flex items-center gap-1.5 rounded-lg bg-ent px-3 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60"
              >
                {laudo.isFetching ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" /> Gerando…
                  </>
                ) : (
                  <>
                    <Sparkles className="size-3.5" /> Gerar laudo escrito
                  </>
                )}
              </button>
            )}
          </div>

          {laudo.data && (
            <div className="mt-3">
              <p className="whitespace-pre-line text-sm leading-relaxed text-ink-2">
                {laudo.data.texto}
              </p>
              <p className="mt-3 flex items-center gap-1.5 text-[11px] text-muted">
                <CheckCircle2 className="size-3" />
                Redigido por IA ({laudo.data.meta.modelo}) ·{" "}
                {num(laudo.data.meta.tokensEntrada + laudo.data.meta.tokensSaida)} tokens. Confira
                antes de apresentar.
              </p>
            </div>
          )}
        </div>

        {/* Rodapé */}
        <footer className="mt-6 flex items-center gap-1.5 border-t border-hairline pt-3 text-[11px] text-muted">
          <CheckCircle2 className="size-3" />
          Regras e indicadores calculados diretamente dos saldos do contábil (sem IA).
        </footer>
      </section>
    </>
  );
}

function Regras({ analise }: { analise: AnaliseDeterministica }) {
  const { cobertura: cob } = analise;
  const coberturaParcial =
    cob.mesesComMovimento < cob.mesesSolicitados || !cob.temSaldoInicial;
  const semProblema = analise.inconsistencias.length === 0;

  return (
    <div className="mb-6 space-y-2">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">
        Validação contábil (regras)
      </h2>

      {analise.inconsistencias.map((i, idx) => (
        <div
          key={idx}
          className={clsx("rounded-lg border px-3 py-2", SEVERIDADE[i.severidade])}
        >
          <div className="flex items-center gap-2">
            <span
              className={clsx(
                "text-[10px] font-bold uppercase tracking-wide",
                i.severidade === "alta"
                  ? "text-critical"
                  : i.severidade === "media"
                    ? "text-warn"
                    : "text-muted"
              )}
            >
              {i.severidade}
            </span>
            <p className="text-sm font-medium text-ink">{i.titulo}</p>
          </div>
          <p className="mt-0.5 text-xs leading-snug text-ink-2">{i.detalhe}</p>
        </div>
      ))}

      {semProblema && (
        <div className="flex items-center gap-2 rounded-lg border border-good/25 bg-good/5 px-3 py-2 text-sm text-ink">
          <CheckCircle2 className="size-4 shrink-0 text-good" />
          Nenhuma inconsistência de regra: o balancete fecha e os saldos respeitam a natureza
          das contas.
        </div>
      )}

      {coberturaParcial && (
        <p className="text-xs text-muted">
          Cobertura: {num(cob.mesesComMovimento)} de {num(cob.mesesSolicitados)} meses com
          movimento
          {cob.primeiroMesComDado ? ` (a partir de ${cob.primeiroMesComDado})` : ""}.
          {!cob.temSaldoInicial &&
            " Sem saldo antes do período — empresa nova no recorte ou início da escrituração."}
        </p>
      )}
    </div>
  );
}
