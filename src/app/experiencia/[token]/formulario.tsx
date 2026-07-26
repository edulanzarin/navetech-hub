"use client";

import { useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import clsx from "clsx";
import { SeloEmpresa } from "@/components/rh-selo-empresa";
import { mutar } from "@/hooks/mutar";
import { dataBR } from "@/lib/format";
import {
  CRITERIOS_EXPERIENCIA,
  ESCALA,
  recomendacoesDoMarco,
  rotuloMarco,
  type CriterioChave,
  type Marco,
} from "@/lib/rh-experiencia";

export function Formulario({
  token,
  nome,
  empresa,
  cargo,
  setor,
  marco,
  vencimento,
}: {
  token: string;
  nome: string;
  empresa: number;
  cargo: string | null;
  setor: string | null;
  marco: Marco;
  vencimento: string;
}) {
  const [respNome, setRespNome] = useState("");
  const [respEmail, setRespEmail] = useState("");
  const [criterios, setCriterios] = useState<Partial<Record<CriterioChave, number>>>({});
  const [recomendacao, setRecomendacao] = useState<string>("");
  const [comentarios, setComentarios] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [pronto, setPronto] = useState(false);

  const recomendacoes = recomendacoesDoMarco(marco);

  const enviar = async () => {
    setErro(null);
    if (!respNome.trim()) return setErro("Informe seu nome.");
    if (CRITERIOS_EXPERIENCIA.some((c) => criterios[c.chave] == null))
      return setErro("Avalie todos os critérios.");
    if (!recomendacao) return setErro("Escolha uma recomendação.");

    setEnviando(true);
    try {
      await mutar(`/api/experiencia/${token}`, "POST", {
        respondidoPorNome: respNome,
        respondidoPorEmail: respEmail,
        recomendacao,
        criterios,
        comentarios,
      });
      setPronto(true);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao enviar. Tente novamente.");
    } finally {
      setEnviando(false);
    }
  };

  if (pronto) {
    return (
      <div className="card px-6 py-10 text-center">
        <CheckCircle2 className="mx-auto size-10 text-good" />
        <h1 className="mt-3 text-lg font-semibold text-ink">Avaliação enviada</h1>
        <p className="mt-1 text-sm text-muted">
          Obrigado! A avaliação de experiência de {nome} foi registrada.
        </p>
      </div>
    );
  }

  return (
    <div className="card overflow-hidden">
      <header className="border-b border-hairline px-6 py-5">
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-semibold text-ink">Avaliação de experiência</h1>
          <span className="rounded bg-surface-2 px-1.5 py-0.5 text-[11px] font-medium text-ink-2">
            {rotuloMarco(marco)}
          </span>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
          <span className="font-medium text-ink">{nome}</span>
          <SeloEmpresa codigo={empresa} />
          <span className="text-muted">
            {cargo ?? "—"}
            {setor ? ` · ${setor}` : ""}
          </span>
        </div>
        <p className="mt-1 text-xs text-muted">Fim do período: {dataBR(vencimento)}</p>
      </header>

      <div className="space-y-6 px-6 py-5">
        {/* Quem responde */}
        <section className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-ink-2">Seu nome *</span>
            <input
              value={respNome}
              onChange={(e) => setRespNome(e.target.value)}
              className="h-9 w-full rounded-lg border border-hairline bg-surface px-3 text-sm outline-none focus:border-ink/30"
              placeholder="Nome do gestor"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-ink-2">Seu e-mail</span>
            <input
              value={respEmail}
              onChange={(e) => setRespEmail(e.target.value)}
              className="h-9 w-full rounded-lg border border-hairline bg-surface px-3 text-sm outline-none focus:border-ink/30"
              placeholder="opcional"
            />
          </label>
        </section>

        {/* Critérios */}
        <section>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-2">
            Avaliação
          </h2>
          <div className="space-y-2">
            {CRITERIOS_EXPERIENCIA.map((c) => (
              <div
                key={c.chave}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-hairline px-3 py-2"
              >
                <span className="text-sm text-ink">{c.rotulo}</span>
                <div className="inline-flex rounded-lg border border-hairline bg-surface p-0.5">
                  {ESCALA.map((rotulo, idx) => (
                    <button
                      key={rotulo}
                      type="button"
                      onClick={() => setCriterios((s) => ({ ...s, [c.chave]: idx }))}
                      className={clsx(
                        "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                        criterios[c.chave] === idx
                          ? "bg-surface-2 text-ink"
                          : "text-muted hover:text-ink"
                      )}
                    >
                      {rotulo}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Recomendação */}
        <section>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-2">
            Recomendação *
          </h2>
          <div className="grid gap-2">
            {recomendacoes.map((r) => (
              <button
                key={r.valor}
                type="button"
                onClick={() => setRecomendacao(r.valor)}
                className={clsx(
                  "rounded-lg border px-3 py-2.5 text-left text-sm transition-colors",
                  recomendacao === r.valor
                    ? "border-ink/30 bg-surface-2 text-ink"
                    : "border-hairline text-ink-2 hover:bg-surface-2/50"
                )}
              >
                {r.rotulo}
              </button>
            ))}
          </div>
        </section>

        {/* Comentários */}
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-ink-2">Comentários</span>
          <textarea
            value={comentarios}
            onChange={(e) => setComentarios(e.target.value)}
            rows={4}
            className="w-full rounded-lg border border-hairline bg-surface px-3 py-2 text-sm outline-none focus:border-ink/30"
            placeholder="Observações sobre o desempenho no período (opcional)"
          />
        </label>

        {erro && <p className="text-sm text-critical">{erro}</p>}

        <button
          onClick={enviar}
          disabled={enviando}
          className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-ink text-sm font-medium text-surface transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {enviando && <Loader2 className="size-4 animate-spin" />}
          {enviando ? "Enviando…" : "Enviar avaliação"}
        </button>
      </div>
    </div>
  );
}
