"use client";

import clsx from "clsx";
import { useState, useSyncExternalStore } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { mutar } from "@/hooks/mutar";
import {
  ESCALA_TEMA,
  validarRespostaClima,
  type RodadaPublica,
} from "@/lib/clima-tipos";

const CAMPO = "h-9 w-full rounded-lg border border-hairline bg-surface px-3 text-sm outline-none focus:border-ink/30";

export function ClimaForm({ rodada }: { rodada: RodadaPublica }) {
  const chave = `clima:${rodada.slug}`;
  const [notaRec, setNotaRec] = useState<number | null>(null);
  const [notas, setNotas] = useState<Record<string, number>>({});
  const [comentario, setComentario] = useState("");
  const [setor, setSetor] = useState("");
  const [erros, setErros] = useState<Record<string, string>>({});
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [pronto, setPronto] = useState(false);
  const [ignorar, setIgnorar] = useState(false);

  // Soft-guard: este dispositivo já respondeu esta rodada? (só client, sem quebrar
  // a hidratação). Link aberto não impede de verdade — é só um aviso amigável.
  const respondeuAntes = useSyncExternalStore(
    () => () => {},
    () => !!window.localStorage.getItem(chave),
    () => false
  );

  const enviar = async () => {
    setErroGeral(null);
    const entrada = {
      notaRecomendacao: notaRec ?? -1,
      notas,
      comentario: comentario || null,
      setor: setor || null,
    };
    const es = validarRespostaClima(rodada.temas, entrada);
    setErros(es);
    if (Object.keys(es).length) return setErroGeral("Responda a recomendação e todas as notas.");

    setEnviando(true);
    try {
      await mutar(`/api/clima/${rodada.slug}`, "POST", entrada);
      try {
        window.localStorage.setItem(chave, "1");
      } catch {
        /* localStorage indisponível — sem soft-guard, só o obrigado */
      }
      setPronto(true);
    } catch (e) {
      setErroGeral(e instanceof Error ? e.message : "Falha ao enviar. Tente novamente.");
    } finally {
      setEnviando(false);
    }
  };

  if (pronto) {
    return (
      <div className="card px-6 py-10 text-center">
        <CheckCircle2 className="mx-auto size-10 text-good" />
        <h1 className="mt-3 text-lg font-semibold text-ink">Avaliação enviada</h1>
        <p className="mt-1 text-sm text-muted">Obrigado! Sua resposta é anônima e já foi registrada.</p>
      </div>
    );
  }

  if (respondeuAntes && !ignorar) {
    return (
      <div className="card px-6 py-10 text-center">
        <h1 className="text-lg font-semibold text-ink">Você já respondeu</h1>
        <p className="mt-1 text-sm text-muted">
          Este dispositivo já enviou uma avaliação nesta rodada. Se quiser responder de novo, clique
          abaixo.
        </p>
        <button
          onClick={() => setIgnorar(true)}
          className="mt-4 rounded-lg border border-hairline px-4 py-2 text-sm font-medium text-ink-2 transition-colors hover:text-ink"
        >
          Responder novamente
        </button>
      </div>
    );
  }

  return (
    <div className="card overflow-hidden">
      <header className="border-b border-hairline px-6 py-5">
        <h1 className="text-lg font-semibold text-ink">{rodada.titulo}</h1>
        {rodada.descricao && <p className="mt-1 text-sm text-muted">{rodada.descricao}</p>}
      </header>

      <div className="space-y-7 px-6 py-6">
        {/* eNPS */}
        <section>
          <p className="text-sm font-medium text-ink-2">
            De 0 a 10, o quanto você recomendaria a empresa como lugar para trabalhar?
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {Array.from({ length: 11 }, (_, n) => (
              <button
                key={n}
                onClick={() => setNotaRec(n)}
                className={clsx(
                  "h-9 w-9 rounded-lg border text-sm font-medium transition-colors",
                  notaRec === n
                    ? "border-ink bg-ink text-surface"
                    : "border-hairline text-ink-2 hover:border-ink/30"
                )}
              >
                {n}
              </button>
            ))}
          </div>
          <div className="mt-1 flex justify-between text-[11px] text-muted">
            <span>Não recomendaria</span>
            <span>Recomendaria muito</span>
          </div>
          {erros.recomendacao && <p className="mt-1 text-xs text-critical">{erros.recomendacao}</p>}
        </section>

        {/* Temas */}
        <section className="space-y-4">
          <p className="text-sm font-medium text-ink-2">Como você avalia cada ponto?</p>
          {rodada.temas.map((t) => (
            <div key={t.id}>
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-sm text-ink">{t.rotulo}</span>
                {erros[t.id] && <span className="text-xs text-critical">{erros[t.id]}</span>}
              </div>
              <div className="flex gap-1.5">
                {ESCALA_TEMA.map((rotulo, i) => {
                  const valor = i + 1;
                  const sel = notas[t.id] === valor;
                  return (
                    <button
                      key={valor}
                      title={rotulo}
                      onClick={() => setNotas((s) => ({ ...s, [t.id]: valor }))}
                      className={clsx(
                        "h-9 flex-1 rounded-lg border text-xs font-medium transition-colors",
                        sel
                          ? "border-ink bg-ink text-surface"
                          : "border-hairline text-ink-2 hover:border-ink/30"
                      )}
                    >
                      {rotulo}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </section>

        {/* Comentário + setor */}
        <section className="space-y-4">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-ink-2">
              Quer deixar um comentário? (opcional)
            </span>
            <textarea
              value={comentario}
              onChange={(e) => setComentario(e.target.value)}
              rows={4}
              className="w-full rounded-lg border border-hairline bg-surface px-3 py-2 text-sm outline-none focus:border-ink/30"
              placeholder="O que a empresa faz bem e o que poderia melhorar."
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-ink-2">Seu setor (opcional)</span>
            <input
              value={setor}
              onChange={(e) => setSetor(e.target.value)}
              className={CAMPO}
              placeholder="Ajuda a entender por área — nunca identifica você"
            />
          </label>
        </section>

        {erroGeral && <p className="text-sm text-critical">{erroGeral}</p>}

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
