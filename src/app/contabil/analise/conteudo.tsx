"use client";

import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  FileDown,
  Lightbulb,
  Loader2,
  Minus,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import clsx from "clsx";
import { useFiltros } from "@/hooks/use-filters";
import { useAnaliseBalancete } from "@/hooks/use-api";
import { dataBR, num } from "@/lib/format";
import type {
  AnaliseBalanceteResp,
  AnaliseIndicador,
  LaudoAnalise,
} from "@/lib/types";

const SAUDE: Record<
  LaudoAnalise["saudeGeral"],
  { rotulo: string; classe: string }
> = {
  forte: { rotulo: "Saúde forte", classe: "bg-good/12 text-good" },
  estavel: { rotulo: "Estável", classe: "bg-ent/12 text-ent" },
  atencao: { rotulo: "Requer atenção", classe: "bg-warning/12 text-warn" },
  critica: { rotulo: "Crítica", classe: "bg-critical/12 text-critical" },
};

const SEVERIDADE: Record<string, string> = {
  alta: "border-critical/40 bg-critical/8 text-critical",
  media: "border-warning/40 bg-warning/8 text-warn",
  baixa: "border-hairline bg-surface-2 text-muted",
};

const PRIORIDADE: Record<string, string> = {
  alta: "bg-critical/12 text-critical",
  media: "bg-warning/12 text-warn",
  baixa: "bg-surface-2 text-muted",
};

function TendenciaIcone({ t }: { t: AnaliseIndicador["tendencia"] }) {
  if (t === "melhora") return <TrendingUp className="size-3.5 text-good" />;
  if (t === "piora") return <TrendingDown className="size-3.5 text-critical" />;
  return <Minus className="size-3.5 text-muted" />;
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
        <p className="max-w-md text-xs text-muted">
          Escolha uma empresa e o período (até 12 meses) no filtro acima e clique em
          Analisar. A análise usa os saldos do contábil no período.
        </p>
      </section>
    );
  }

  if (q.isLoading || (q.isFetching && !dados)) {
    return (
      <section className="card grid place-items-center gap-4 px-6 py-20 text-center">
        <span className="grid size-12 place-items-center rounded-2xl bg-ent/12 text-ent">
          <Loader2 className="size-6 animate-spin" />
        </span>
        <div>
          <p className="text-sm font-medium text-ink">Gerando a análise…</p>
          <p className="mt-1 max-w-md text-xs text-muted">
            Coletando os saldos do período e montando o laudo com a IA. Costuma levar de
            alguns segundos a meio minuto.
          </p>
        </div>
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

  return <Laudo dados={dados} />;
}

function Laudo({ dados }: { dados: AnaliseBalanceteResp }) {
  const { laudo, empresa, periodo, meta } = dados;
  const saude = SAUDE[laudo.saudeGeral] ?? SAUDE.estavel;
  const custoTokens = meta.tokensEntrada + meta.tokensSaida;

  return (
    <>
      {/* CSS de impressão: some tudo e mostra só o laudo, limpo, no PDF. */}
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
        {/* Cabeçalho do laudo */}
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
              Período {dataBR(periodo.inicio)} – {dataBR(periodo.fim)} ({periodo.meses.length}{" "}
              {periodo.meses.length === 1 ? "mês" : "meses"})
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span
              className={clsx(
                "rounded-full px-3 py-1 text-xs font-semibold",
                saude.classe
              )}
            >
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

        {/* Resumo executivo */}
        <div className="mb-6">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
            Resumo executivo
          </h2>
          <p className="whitespace-pre-line text-sm leading-relaxed text-ink-2">
            {laudo.resumoExecutivo}
          </p>
        </div>

        {/* Indicadores */}
        {laudo.indicadores.length > 0 && (
          <div className="mb-6">
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
              Indicadores
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {laudo.indicadores.map((ind, i) => (
                <div key={i} className="rounded-xl border border-hairline bg-surface-2/40 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-muted">{ind.nome}</span>
                    <TendenciaIcone t={ind.tendencia} />
                  </div>
                  <p className="mt-1 text-lg font-semibold tabular-nums text-ink">
                    {ind.valor}
                  </p>
                  <p className="mt-1 text-xs leading-snug text-muted">{ind.interpretacao}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pontos fortes e fracos, lado a lado */}
        <div className="mb-6 grid gap-5 lg:grid-cols-2">
          {laudo.pontosFortes.length > 0 && (
            <div>
              <h2 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-good">
                <ThumbsUp className="size-3.5" /> Pontos fortes
              </h2>
              <ul className="flex flex-col gap-2">
                {laudo.pontosFortes.map((p, i) => (
                  <li key={i} className="rounded-lg border border-good/25 bg-good/5 px-3 py-2">
                    <p className="text-sm font-medium text-ink">{p.titulo}</p>
                    <p className="mt-0.5 text-xs leading-snug text-muted">{p.detalhe}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {laudo.pontosFracos.length > 0 && (
            <div>
              <h2 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-warn">
                <ThumbsDown className="size-3.5" /> Pontos fracos
              </h2>
              <ul className="flex flex-col gap-2">
                {laudo.pontosFracos.map((p, i) => (
                  <li key={i} className="rounded-lg border border-warning/25 bg-warning/5 px-3 py-2">
                    <p className="text-sm font-medium text-ink">{p.titulo}</p>
                    <p className="mt-0.5 text-xs leading-snug text-muted">{p.detalhe}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Alertas */}
        {laudo.alertas.length > 0 && (
          <div className="mb-6">
            <h2 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted">
              <AlertTriangle className="size-3.5" /> Alertas
            </h2>
            <ul className="flex flex-col gap-2">
              {laudo.alertas.map((a, i) => (
                <li
                  key={i}
                  className={clsx("rounded-lg border px-3 py-2", SEVERIDADE[a.severidade] ?? SEVERIDADE.baixa)}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wide">
                      {a.severidade}
                    </span>
                    <p className="text-sm font-medium text-ink">{a.titulo}</p>
                  </div>
                  <p className="mt-0.5 text-xs leading-snug text-ink-2">{a.detalhe}</p>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Recomendações */}
        {laudo.recomendacoes.length > 0 && (
          <div className="mb-2">
            <h2 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-ent">
              <Lightbulb className="size-3.5" /> Recomendações
            </h2>
            <ul className="flex flex-col gap-2">
              {laudo.recomendacoes.map((r, i) => (
                <li
                  key={i}
                  className="flex items-start gap-3 rounded-lg border border-hairline bg-surface-2/40 px-3 py-2"
                >
                  <span
                    className={clsx(
                      "mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                      PRIORIDADE[r.prioridade] ?? PRIORIDADE.baixa
                    )}
                  >
                    {r.prioridade}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-ink">{r.titulo}</p>
                    <p className="mt-0.5 text-xs leading-snug text-muted">{r.detalhe}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Rodapé: transparência de origem/custo */}
        <footer className="mt-6 flex items-center gap-1.5 border-t border-hairline pt-3 text-[11px] text-muted">
          <CheckCircle2 className="size-3" />
          Laudo gerado por IA ({meta.modelo}) sobre os saldos do contábil · {num(custoTokens)}{" "}
          tokens. Confira antes de apresentar ao cliente.
        </footer>
      </section>
    </>
  );
}
