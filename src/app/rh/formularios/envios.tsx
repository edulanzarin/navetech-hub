"use client";

import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import clsx from "clsx";
import { CalendarClock, CheckCircle2, Clock, Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { Modal } from "@/components/ui/modal";
import { CamposFormulario } from "@/components/formulario-campos";
import { mutar } from "@/hooks/mutar";
import { useEnvio, useEnvios, useRhGestores } from "@/hooks/use-api";
import { dataBR } from "@/lib/format";
import type { RespostaValores } from "@/lib/formularios-tipos";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const linhasEmail = (s: string) =>
  s
    .split(/[\n,;]+/)
    .map((x) => x.trim().toLowerCase())
    .filter((x) => EMAIL_RE.test(x));

// ── Modal: enviar um formulário ───────────────────────────────────────────────

export function EnviarModal({
  formularioId,
  formularioNome,
  onFechar,
}: {
  formularioId: number;
  formularioNome: string;
  onFechar: () => void;
}) {
  const { data: gestores } = useRhGestores();
  const queryClient = useQueryClient();

  const [titulo, setTitulo] = useState(formularioNome);
  const [mensagem, setMensagem] = useState("");
  const [selec, setSelec] = useState<Set<number>>(new Set());
  const [avulsos, setAvulsos] = useState("");
  const [agendar, setAgendar] = useState(false);
  const [quando, setQuando] = useState("");
  const [enviando, setEnviando] = useState(false);

  const lista = useMemo(() => (gestores ?? []).filter((g) => g.ativo), [gestores]);
  const todosMarcados = lista.length > 0 && selec.size === lista.length;

  const alternar = (id: number) =>
    setSelec((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  const marcarTodos = () =>
    setSelec(todosMarcados ? new Set() : new Set(lista.map((g) => g.id)));

  const totalDestinatarios = useMemo(() => {
    const emails = new Set<string>();
    for (const g of lista) if (selec.has(g.id)) emails.add(g.email.toLowerCase());
    for (const e of linhasEmail(avulsos)) emails.add(e);
    return emails.size;
  }, [lista, selec, avulsos]);

  const enviar = async () => {
    if (totalDestinatarios === 0) return toast.error("Selecione ao menos um destinatário");
    if (agendar && !quando) return toast.error("Escolha a data e a hora do agendamento");

    const porGestor = lista
      .filter((g) => selec.has(g.id))
      .map((g) => ({ email: g.email, nome: g.nome, gestorId: g.id }));
    const avulsosDest = linhasEmail(avulsos).map((email) => ({ email }));

    setEnviando(true);
    try {
      const r = await mutar<{ enviados: number; total: number; agendado: boolean }>(
        "/api/rh/envios",
        "POST",
        {
          formularioId,
          titulo,
          mensagem,
          destinatarios: [...porGestor, ...avulsosDest],
          agendarPara: agendar && quando ? new Date(quando).toISOString() : null,
        }
      );
      queryClient.invalidateQueries({ queryKey: ["rh-envios"] });
      toast.success(
        r.agendado
          ? `Campanha agendada para ${r.total} destinatário(s)`
          : `Enviado para ${r.total} destinatário(s)`
      );
      onFechar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao enviar");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Modal aberto onFechar={onFechar} titulo="Enviar formulário" subtitulo={formularioNome} largura="max-w-xl">
      <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-ink-2">Assunto do e-mail</span>
          <input
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            className="h-9 w-full rounded-lg border border-hairline bg-surface px-3 text-sm outline-none focus:border-ink/30"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-ink-2">Mensagem (opcional)</span>
          <textarea
            value={mensagem}
            onChange={(e) => setMensagem(e.target.value)}
            rows={2}
            className="w-full rounded-lg border border-hairline bg-surface px-3 py-2 text-sm outline-none focus:border-ink/30"
            placeholder="Texto que acompanha o link no e-mail"
          />
        </label>

        {/* Gestores */}
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-xs font-medium text-ink-2">Gestores cadastrados</span>
            {lista.length > 0 && (
              <button onClick={marcarTodos} className="text-xs font-medium text-ent hover:underline">
                {todosMarcados ? "Limpar" : "Selecionar todos"}
              </button>
            )}
          </div>
          {lista.length === 0 ? (
            <p className="rounded-lg border border-hairline px-3 py-2 text-xs text-muted">
              Nenhum gestor cadastrado. Cadastre em Gestores ou use e-mails avulsos abaixo.
            </p>
          ) : (
            <div className="max-h-44 space-y-1 overflow-y-auto rounded-lg border border-hairline p-1.5">
              {lista.map((g) => (
                <label
                  key={g.id}
                  className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 hover:bg-surface-2"
                >
                  <input
                    type="checkbox"
                    checked={selec.has(g.id)}
                    onChange={() => alternar(g.id)}
                    className="size-3.5 accent-ink"
                  />
                  <span className="min-w-0 flex-1 truncate text-sm text-ink">{g.nome}</span>
                  <span className="truncate text-xs text-muted">{g.email}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Avulsos */}
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-ink-2">E-mails avulsos (um por linha)</span>
          <textarea
            value={avulsos}
            onChange={(e) => setAvulsos(e.target.value)}
            rows={2}
            className="w-full rounded-lg border border-hairline bg-surface px-3 py-2 text-sm outline-none focus:border-ink/30"
            placeholder="fulano@empresa.com.br"
          />
        </label>

        {/* Agendamento */}
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-1.5 text-sm text-ink-2">
            <input
              type="checkbox"
              checked={agendar}
              onChange={(e) => setAgendar(e.target.checked)}
              className="size-3.5 accent-ink"
            />
            Agendar envio
          </label>
          {agendar && (
            <input
              type="datetime-local"
              value={quando}
              onChange={(e) => setQuando(e.target.value)}
              className="h-9 rounded-lg border border-hairline bg-surface px-3 text-sm outline-none focus:border-ink/30"
            />
          )}
        </div>
      </div>

      <footer className="flex items-center justify-between gap-3 border-t border-hairline px-6 py-3">
        <span className="text-xs text-muted">
          {totalDestinatarios} destinatário(s)
        </span>
        <button
          onClick={enviar}
          disabled={enviando}
          className="flex h-9 items-center gap-1.5 rounded-lg bg-ink px-3 text-sm font-medium text-surface transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {enviando ? <Loader2 className="size-4 animate-spin" /> : agendar ? <CalendarClock className="size-4" /> : <Send className="size-4" />}
          {enviando ? "Enviando…" : agendar ? "Agendar" : "Enviar agora"}
        </button>
      </footer>
    </Modal>
  );
}

// ── Lista de campanhas ────────────────────────────────────────────────────────

export function EnviosLista() {
  const { data, isLoading } = useEnvios();
  const [verId, setVerId] = useState<number | null>(null);

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="skeleton h-16" />
        ))}
      </div>
    );
  }
  if ((data ?? []).length === 0) {
    return (
      <div className="card grid place-items-center gap-2 py-16 text-center text-muted">
        <Send className="size-8 opacity-40" />
        <p>Nenhuma campanha ainda. Envie um formulário pela aba Formulários.</p>
      </div>
    );
  }

  return (
    <>
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-sm">
            <thead className="bg-surface">
              <tr className="border-b border-hairline text-xs text-muted">
                <th className="py-2 pl-4 pr-3 text-left font-medium">Campanha</th>
                <th className="py-2 px-3 text-left font-medium">Formulário</th>
                <th className="py-2 px-3 text-left font-medium">Quando</th>
                <th className="py-2 px-3 text-left font-medium">Respostas</th>
                <th className="py-2 pl-3 pr-4 text-right font-medium">Ação</th>
              </tr>
            </thead>
            <tbody>
              {(data ?? []).map((e) => {
                const agendadaPendente = !e.disparadoEm && e.agendadoPara;
                return (
                  <tr key={e.id} className="border-b border-hairline/60 last:border-0">
                    <td className="py-3 pl-4 pr-3 font-medium text-ink">{e.titulo}</td>
                    <td className="py-3 px-3 text-ink-2">{e.formularioNome}</td>
                    <td className="py-3 px-3">
                      {e.disparadoEm ? (
                        <span className="inline-flex items-center gap-1 text-ink-2">
                          <CheckCircle2 className="size-3.5 text-good" />
                          {dataBR(e.disparadoEm.slice(0, 10))}
                        </span>
                      ) : agendadaPendente ? (
                        <span className="inline-flex items-center gap-1 text-warning">
                          <Clock className="size-3.5" /> agendada {dataBR(e.agendadoPara!.slice(0, 10))}
                        </span>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                    <td className="py-3 px-3 tabular-nums text-ink-2">
                      {e.respondidos} / {e.total}
                    </td>
                    <td className="py-3 pl-3 pr-4 text-right">
                      <button
                        onClick={() => setVerId(e.id)}
                        className="rounded-lg border border-hairline px-2.5 py-1.5 text-xs font-medium text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink"
                      >
                        Ver respostas
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {verId != null && <RespostasModal envioId={verId} onFechar={() => setVerId(null)} />}
    </>
  );
}

// ── Modal: respostas de uma campanha ──────────────────────────────────────────

function RespostasModal({ envioId, onFechar }: { envioId: number; onFechar: () => void }) {
  const { data, isLoading } = useEnvio(envioId);
  const [aberto, setAberto] = useState<number | null>(null);

  return (
    <Modal aberto onFechar={onFechar} titulo={data?.titulo ?? "Respostas"} largura="max-w-2xl">
      <div className="flex-1 overflow-y-auto px-6 py-5">
        {isLoading || !data ? (
          <div className="skeleton h-40" />
        ) : (
          <div className="divide-y divide-hairline/60">
            {data.destinatarios.map((d) => {
              const respondeu = d.status === "respondido";
              const expandido = aberto === d.id;
              return (
                <div key={d.id} className="py-2.5">
                  <button
                    onClick={() => respondeu && setAberto(expandido ? null : d.id)}
                    className={clsx(
                      "flex w-full items-center justify-between gap-3 text-left",
                      respondeu && "cursor-pointer"
                    )}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-ink">{d.nome || d.email}</p>
                      <p className="truncate text-xs text-muted">{d.email}</p>
                    </div>
                    <span
                      className={clsx(
                        "shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide",
                        respondeu ? "bg-good/12 text-good" : d.status === "erro" ? "bg-critical/12 text-critical" : "bg-surface-2 text-muted"
                      )}
                    >
                      {respondeu ? "Respondido" : d.status === "erro" ? "Erro" : "Aguardando"}
                    </span>
                  </button>
                  {expandido && respondeu && (
                    <div className="mt-3 rounded-lg border border-hairline p-3">
                      <CamposFormulario
                        campos={data.formulario.campos}
                        valores={(d.valores ?? {}) as RespostaValores}
                        somenteLeitura
                      />
                    </div>
                  )}
                </div>
              );
            })}
            {data.destinatarios.length === 0 && (
              <p className="py-6 text-center text-sm text-muted">Sem destinatários.</p>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
