"use client";

import { useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { CamposFormulario } from "@/components/formulario-campos";
import { mutar } from "@/hooks/mutar";
import { validarRespostas, type RespostaValores } from "@/lib/formularios-tipos";
import type { FormularioPublico } from "@/lib/formulario-publico";

export function FormularioPublicoView({
  token,
  dados,
}: {
  token: string;
  dados: FormularioPublico;
}) {
  const [respNome, setRespNome] = useState("");
  const [respEmail, setRespEmail] = useState("");
  const [valores, setValores] = useState<RespostaValores>({});
  const [erros, setErros] = useState<Record<number, string>>({});
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [pronto, setPronto] = useState(false);

  const { formulario } = dados;

  const enviar = async () => {
    setErroGeral(null);
    if (!respNome.trim()) return setErroGeral("Informe seu nome.");
    const es = validarRespostas(formulario.campos, valores);
    setErros(es);
    if (Object.keys(es).length) return setErroGeral("Revise os campos destacados.");

    setEnviando(true);
    try {
      await mutar(`/api/f/${token}`, "POST", {
        respondidoPorNome: respNome,
        respondidoPorEmail: respEmail || null,
        valores,
      });
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
        <h1 className="mt-3 text-lg font-semibold text-ink">Formulário enviado</h1>
        <p className="mt-1 text-sm text-muted">Obrigado! Sua resposta foi registrada.</p>
      </div>
    );
  }

  return (
    <div className="card overflow-hidden">
      <header className="border-b border-hairline px-6 py-5">
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-semibold text-ink">{dados.titulo}</h1>
          {dados.subtitulo && (
            <span className="rounded bg-surface-2 px-1.5 py-0.5 text-[11px] font-medium text-ink-2">
              {dados.subtitulo}
            </span>
          )}
        </div>
        {formulario.descricao && <p className="mt-1 text-sm text-muted">{formulario.descricao}</p>}
        {dados.mensagem && <p className="mt-2 text-sm text-ink-2">{dados.mensagem}</p>}
        {dados.contexto.length > 0 && (
          <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-3">
            {dados.contexto.map((c) => (
              <div key={c.rotulo}>
                <dt className="text-[11px] uppercase tracking-wide text-muted">{c.rotulo}</dt>
                <dd className="text-ink-2">{c.valor}</dd>
              </div>
            ))}
          </dl>
        )}
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
              placeholder="Seu nome"
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

        {/* Campos do formulário */}
        <CamposFormulario
          campos={formulario.campos}
          valores={valores}
          onChange={(cid, v) => setValores((s) => ({ ...s, [String(cid)]: v }))}
          erros={erros}
        />

        {erroGeral && <p className="text-sm text-critical">{erroGeral}</p>}

        <button
          onClick={enviar}
          disabled={enviando}
          className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-ink text-sm font-medium text-surface transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {enviando && <Loader2 className="size-4 animate-spin" />}
          {enviando ? "Enviando…" : "Enviar"}
        </button>
      </div>
    </div>
  );
}
