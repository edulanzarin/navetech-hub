"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Send, CheckCircle2, Clock, UserRound } from "lucide-react";
import clsx from "clsx";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { SeloEmpresa } from "@/components/rh-selo-empresa";
import { BotaoExecutar } from "@/components/filters/botao-executar";
import { FiltroPendente } from "@/components/filtro-pendente";
import { useRhExperiencia } from "@/hooks/use-api";
import { useEstadoModulo } from "@/hooks/use-estado-modulo";
import { mutar } from "@/hooks/mutar";
import { EMPRESAS_RH, nomeEmpresaRh } from "@/lib/rh";
import { dataBR } from "@/lib/format";
import {
  STATUS_ROTULO,
  rotuloMarco,
  rotuloRecomendacao,
  type StatusExperiencia,
} from "@/lib/rh-experiencia";
import type { ExperienciaItem } from "@/lib/rh-tipos";

type FiltroEmpresa = "todas" | number;

const STATUS_CLASSE: Record<StatusExperiencia, string> = {
  pendente: "bg-surface-2 text-muted",
  enviado: "bg-warn/12 text-warn",
  atraso: "bg-critical/12 text-critical",
  respondido: "bg-good/12 text-good",
};

function prazoTexto(dias: number): string {
  if (dias === 0) return "vence hoje";
  if (dias > 0) return `em ${dias} ${dias === 1 ? "dia" : "dias"}`;
  const d = Math.abs(dias);
  return `há ${d} ${d === 1 ? "dia" : "dias"}`;
}

function Kpi({ rotulo, valor, tom }: { rotulo: string; valor: number; tom: string }) {
  return (
    <div className="card px-4 py-3">
      <p className="text-xs text-muted">{rotulo}</p>
      <p className={clsx("mt-0.5 text-2xl font-semibold tabular-nums", tom)}>{valor}</p>
    </div>
  );
}

export default function Conteudo() {
  const [empresa, setEmpresa] = useEstadoModulo<FiltroEmpresa>("rh/experiencia:empresa", "todas");
  const qs = empresa === "todas" ? "" : `empresa=${empresa}`;
  // Nada consulta até o Visualizar (padrão executar-por-botão); persiste no módulo.
  const [qsAplicado, setQsAplicado] = useEstadoModulo<string | null>(
    "rh/experiencia:qsAplicado",
    null
  );
  const { data, isLoading } = useRhExperiencia(qsAplicado ?? "", qsAplicado != null);
  const queryClient = useQueryClient();
  const [enviando, setEnviando] = useState<string | null>(null);

  const dirty = qsAplicado !== qs;
  const executar = () => {
    setQsAplicado(qs);
    queryClient.invalidateQueries({ queryKey: ["rh-experiencia"] });
  };

  const itens = useMemo(() => data ?? [], [data]);

  const kpis = useMemo(() => {
    let atraso = 0;
    let aVencer = 0;
    let respondido = 0;
    let semGestor = 0;
    for (const i of itens) {
      if (i.status === "respondido") respondido++;
      else if (i.status === "atraso") atraso++;
      else aVencer++;
      if (i.status !== "respondido" && i.gestores === 0) semGestor++;
    }
    return { atraso, aVencer, respondido, semGestor };
  }, [itens]);

  const chave = (i: ExperienciaItem) => `${i.codigoempresa}-${i.contrato}-${i.marco}`;

  const reenviar = async (i: ExperienciaItem) => {
    setEnviando(chave(i));
    try {
      const r = await mutar<{ enviado: boolean; destinatarios: string[] }>(
        "/api/rh/experiencia-reenviar",
        "POST",
        { codigoempresa: i.codigoempresa, contrato: i.contrato, marco: i.marco }
      );
      queryClient.invalidateQueries({ queryKey: ["rh-experiencia"] });
      toast.success(
        r.enviado
          ? `Formulário enviado para ${r.destinatarios.length} gestor(es)`
          : "Formulário registrado (e-mail não configurado — ver log do servidor)"
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao enviar");
    } finally {
      setEnviando(null);
    }
  };

  const segmentos: { valor: FiltroEmpresa; rotulo: string }[] = [
    { valor: "todas", rotulo: "Ambas" },
    ...EMPRESAS_RH.map((cod) => ({ valor: cod as FiltroEmpresa, rotulo: nomeEmpresaRh(cod) })),
  ];

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-lg border border-hairline bg-surface p-0.5">
          {segmentos.map((s) => (
            <button
              key={String(s.valor)}
              onClick={() => setEmpresa(s.valor)}
              className={clsx(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                empresa === s.valor ? "bg-surface-2 text-ink" : "text-muted hover:text-ink"
              )}
            >
              {s.rotulo}
            </button>
          ))}
        </div>
        <BotaoExecutar onClick={executar} dirty={dirty} rotulo="Visualizar" />
      </div>

      {qsAplicado == null ? (
        <FiltroPendente rotulo="Visualizar" />
      ) : (
      <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Kpi rotulo="A vencer" valor={kpis.aVencer} tom="text-ink" />
        <Kpi rotulo="Em atraso" valor={kpis.atraso} tom="text-critical" />
        <Kpi rotulo="Respondidos" valor={kpis.respondido} tom="text-good" />
        <Kpi rotulo="Sem gestor" valor={kpis.semGestor} tom="text-warn" />
      </div>

      <div className="card overflow-hidden">
        <div className="max-h-[42rem] overflow-y-auto overflow-x-auto">
          <table className="w-full min-w-[860px] border-collapse text-sm">
            <thead className="sticky top-0 z-10 bg-surface">
              <tr className="border-b border-hairline text-xs text-muted">
                <th className="py-2 pl-4 pr-3 text-left font-medium">Funcionário</th>
                <th className="py-2 px-3 text-left font-medium">Marco</th>
                <th className="py-2 px-3 text-left font-medium">Vencimento</th>
                <th className="py-2 px-3 text-left font-medium">Situação</th>
                <th className="py-2 px-3 text-left font-medium">Gestores</th>
                <th className="py-2 pl-3 pr-4 text-right font-medium">Ação</th>
              </tr>
            </thead>
            <tbody>
              {itens.map((i) => (
                <tr
                  key={chave(i)}
                  className="border-b border-hairline/60 last:border-0 align-top"
                >
                  <td className="py-3 pl-4 pr-3">
                    <div className="flex items-center gap-2">
                      <span className="grid size-7 shrink-0 place-items-center rounded-full bg-surface-2 text-muted">
                        <UserRound className="size-3.5" />
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-ink">{i.nome}</span>
                          <SeloEmpresa codigo={i.codigoempresa} />
                        </div>
                        <p className="text-[11px] text-muted">
                          {i.cargo ?? "—"}
                          {i.setor ? ` · ${i.setor}` : ""}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-3">
                    <span className="rounded bg-surface-2 px-1.5 py-0.5 text-[11px] font-medium text-ink-2">
                      {rotuloMarco(i.marco)}
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    <p className="tabular-nums text-ink-2">{dataBR(i.vencimento)}</p>
                    <p
                      className={clsx(
                        "text-[11px]",
                        i.diasParaVencer < 0 ? "text-critical" : "text-muted"
                      )}
                    >
                      {prazoTexto(i.diasParaVencer)}
                    </p>
                  </td>
                  <td className="py-3 px-3">
                    <span
                      className={clsx(
                        "inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide",
                        STATUS_CLASSE[i.status]
                      )}
                    >
                      {i.status === "respondido" && <CheckCircle2 className="size-3" />}
                      {i.status === "atraso" && <AlertTriangle className="size-3" />}
                      {i.status === "enviado" && <Clock className="size-3" />}
                      {STATUS_ROTULO[i.status]}
                    </span>
                    {i.resposta && (
                      <p className="mt-1 max-w-[220px] text-[11px] text-muted">
                        {rotuloRecomendacao(i.resposta.recomendacao)}
                        <br />
                        <span className="text-muted/80">por {i.resposta.respondidoPor}</span>
                      </p>
                    )}
                    {i.ultimoLembrete && !i.resposta && (
                      <p className="mt-1 text-[11px] text-muted">
                        último aviso {dataBR(i.ultimoLembrete.slice(0, 10))}
                      </p>
                    )}
                  </td>
                  <td className="py-3 px-3">
                    {i.gestores === 0 ? (
                      <span className="inline-flex items-center gap-1 text-[11px] text-warn">
                        <AlertTriangle className="size-3" /> nenhum
                      </span>
                    ) : (
                      <span className="text-ink-2 tabular-nums">{i.gestores}</span>
                    )}
                  </td>
                  <td className="py-3 pl-3 pr-4 text-right">
                    {i.status !== "respondido" && (
                      <button
                        onClick={() => reenviar(i)}
                        disabled={i.gestores === 0 || enviando === chave(i)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-hairline px-2.5 py-1.5 text-xs font-medium text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink disabled:opacity-40"
                        title={i.gestores === 0 ? "Cadastre um gestor no setor" : "Enviar formulário agora"}
                      >
                        <Send className="size-3.5" />
                        {enviando === chave(i) ? "Enviando…" : i.ultimoLembrete ? "Reenviar" : "Enviar"}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {!isLoading && itens.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-sm text-muted">
                    Nenhum contrato em experiência no período.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      </>
      )}
    </>
  );
}
