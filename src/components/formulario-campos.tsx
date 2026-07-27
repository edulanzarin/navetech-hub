"use client";

import clsx from "clsx";
import { Check } from "lucide-react";
import {
  escalaDoCampo,
  type FormularioCampo,
  type RespostaValores,
  type ValorCampo,
} from "@/lib/formularios-tipos";

/**
 * Renderer DINÂMICO dos campos de um formulário — a partir da definição
 * (formulario_campo). Uma peça só, usada pelo preview do builder e pelo
 * formulário público (por token). Controlado: `valores` + `onChange`.
 * `somenteLeitura` desenha a resposta guardada sem permitir edição (painéis).
 */
export function CamposFormulario({
  campos,
  valores,
  onChange,
  erros = {},
  somenteLeitura = false,
}: {
  campos: FormularioCampo[];
  valores: RespostaValores;
  onChange?: (campoId: number, valor: ValorCampo) => void;
  erros?: Record<number, string>;
  somenteLeitura?: boolean;
}) {
  return (
    <div className="space-y-5">
      {campos.map((campo) => (
        <div key={campo.id}>
          <div className="mb-1.5 flex items-baseline gap-1.5">
            <span className="text-sm font-medium text-ink">{campo.rotulo}</span>
            {campo.obrigatorio && <span className="text-critical">*</span>}
            {campo.config.papel === "decisao" && (
              <span className="rounded bg-ent/12 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-ent">
                decisão
              </span>
            )}
          </div>
          {campo.ajuda && <p className="mb-2 text-xs text-muted">{campo.ajuda}</p>}
          <CampoControle
            campo={campo}
            valor={valores[String(campo.id)]}
            onChange={(v) => onChange?.(campo.id, v)}
            somenteLeitura={somenteLeitura}
          />
          {erros[campo.id] && <p className="mt-1 text-xs text-critical">{erros[campo.id]}</p>}
        </div>
      ))}
    </div>
  );
}

const INPUT =
  "w-full rounded-lg border border-hairline bg-surface px-3 text-sm outline-none focus:border-ink/30 disabled:opacity-70";

function CampoControle({
  campo,
  valor,
  onChange,
  somenteLeitura,
}: {
  campo: FormularioCampo;
  valor: ValorCampo;
  onChange: (v: ValorCampo) => void;
  somenteLeitura: boolean;
}) {
  switch (campo.tipo) {
    case "texto_curto":
      return (
        <input
          value={typeof valor === "string" ? valor : ""}
          onChange={(e) => onChange(e.target.value)}
          disabled={somenteLeitura}
          className={clsx(INPUT, "h-9")}
          placeholder="Sua resposta"
        />
      );

    case "texto_longo":
      return (
        <textarea
          value={typeof valor === "string" ? valor : ""}
          onChange={(e) => onChange(e.target.value)}
          disabled={somenteLeitura}
          rows={4}
          className={clsx(INPUT, "py-2")}
          placeholder="Sua resposta"
        />
      );

    case "selecao_unica":
      return (
        <div className="grid gap-2">
          {(campo.config.opcoes ?? []).map((op) => {
            const sel = valor === op;
            return (
              <button
                key={op}
                type="button"
                disabled={somenteLeitura}
                onClick={() => onChange(op)}
                className={clsx(
                  "flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                  sel
                    ? "border-ink/30 bg-surface-2 text-ink"
                    : "border-hairline text-ink-2 hover:bg-surface-2/50",
                  somenteLeitura && "cursor-default"
                )}
              >
                <span
                  className={clsx(
                    "grid size-4 shrink-0 place-items-center rounded-full border",
                    sel ? "border-ink bg-ink" : "border-hairline"
                  )}
                >
                  {sel && <span className="size-1.5 rounded-full bg-surface" />}
                </span>
                {op}
              </button>
            );
          })}
        </div>
      );

    case "selecao_multipla": {
      const arr = Array.isArray(valor) ? valor : [];
      const alternar = (op: string) =>
        onChange(arr.includes(op) ? arr.filter((x) => x !== op) : [...arr, op]);
      return (
        <div className="grid gap-2">
          {(campo.config.opcoes ?? []).map((op) => {
            const sel = arr.includes(op);
            return (
              <button
                key={op}
                type="button"
                disabled={somenteLeitura}
                onClick={() => alternar(op)}
                className={clsx(
                  "flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                  sel
                    ? "border-ink/30 bg-surface-2 text-ink"
                    : "border-hairline text-ink-2 hover:bg-surface-2/50",
                  somenteLeitura && "cursor-default"
                )}
              >
                <span
                  className={clsx(
                    "grid size-4 shrink-0 place-items-center rounded border",
                    sel ? "border-ink bg-ink text-surface" : "border-hairline"
                  )}
                >
                  {sel && <Check className="size-3" />}
                </span>
                {op}
              </button>
            );
          })}
        </div>
      );
    }

    case "nota": {
      const escala = escalaDoCampo(campo);
      const idx = typeof valor === "number" ? valor : -1;
      return (
        <div className="inline-flex flex-wrap gap-1 rounded-lg border border-hairline bg-surface p-0.5">
          {escala.map((rotulo, i) => (
            <button
              key={rotulo + i}
              type="button"
              disabled={somenteLeitura}
              onClick={() => onChange(i)}
              className={clsx(
                "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                idx === i ? "bg-surface-2 text-ink" : "text-muted hover:text-ink",
                somenteLeitura && "cursor-default"
              )}
            >
              {rotulo}
            </button>
          ))}
        </div>
      );
    }

    case "pontuacao": {
      const min = campo.config.min ?? 0;
      const max = campo.config.max ?? 100;
      const n = typeof valor === "number" ? valor : "";
      return (
        <div className="flex items-center gap-3">
          <input
            type="number"
            min={min}
            max={max}
            value={n}
            onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
            disabled={somenteLeitura}
            className={clsx(INPUT, "h-9 w-28")}
          />
          <span className="text-xs text-muted">
            de {min} a {max}
          </span>
        </div>
      );
    }
  }
}
