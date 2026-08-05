"use client";

import clsx from "clsx";
import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Modal } from "@/components/ui/modal";
import { LinkPublico } from "@/components/link-publico";
import { ChartCard, TooltipContainer, TooltipLinha } from "@/components/ui/chart-card";
import { useClimaDashboard, useRodadasClima } from "@/hooks/use-api";
import { mutar } from "@/hooks/mutar";
import { num } from "@/lib/format";
import type { ClimaDashboard } from "@/lib/clima-tipos";

const CAMPO = "h-9 rounded-lg border border-hairline bg-surface px-3 text-sm outline-none focus:border-ink/30";

/** Cor de uma nota de recomendação 0..10 pela faixa eNPS. */
function corNota(n: number): string {
  if (n >= 9) return "var(--good)";
  if (n >= 7) return "var(--warning)";
  return "var(--critical)";
}
function corScore(score: number): string {
  if (score >= 30) return "text-good";
  if (score >= 0) return "text-warning";
  return "text-critical";
}

export default function Conteudo() {
  const { data: rodadasData, isLoading: carregandoRodadas } = useRodadasClima();
  const rodadas = rodadasData?.rodadas ?? [];
  const [sel, setSel] = useState<number | null>(null);
  const selId = sel ?? rodadas[0]?.id ?? null;
  const rodadaSel = rodadas.find((r) => r.id === selId) ?? null;

  const { data: dash, isLoading: carregandoDash } = useClimaDashboard(selId);
  const [novaAberta, setNovaAberta] = useState(false);
  const qc = useQueryClient();

  const alternarStatus = async () => {
    if (!rodadaSel) return;
    const novo = rodadaSel.status === "aberta" ? "fechada" : "aberta";
    try {
      await mutar("/api/rh/clima", "PATCH", { id: rodadaSel.id, status: novo });
      qc.invalidateQueries({ queryKey: ["rh-clima-rodadas"] });
      qc.invalidateQueries({ queryKey: ["rh-clima", rodadaSel.id] });
      toast.success(novo === "aberta" ? "Rodada reaberta" : "Rodada fechada");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao atualizar");
    }
  };

  return (
    <div className="space-y-4">
      {/* Barra de rodada: seletor + status + nova */}
      <div className="card p-4">
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selId ?? ""}
            onChange={(e) => setSel(Number(e.target.value))}
            className={clsx(CAMPO, "min-w-52 flex-1")}
            disabled={carregandoRodadas || rodadas.length === 0}
          >
            {rodadas.length === 0 && <option value="">Nenhuma rodada</option>}
            {rodadas.map((r) => (
              <option key={r.id} value={r.id}>
                {r.titulo} · {r.respostas} {r.respostas === 1 ? "resposta" : "respostas"}
                {r.status === "fechada" ? " (fechada)" : ""}
              </option>
            ))}
          </select>

          {rodadaSel && (
            <button
              onClick={alternarStatus}
              className="flex h-9 items-center rounded-lg border border-hairline px-3 text-sm font-medium text-ink-2 transition-colors hover:text-ink"
            >
              {rodadaSel.status === "aberta" ? "Fechar rodada" : "Reabrir rodada"}
            </button>
          )}
          <button
            onClick={() => setNovaAberta(true)}
            className="flex h-9 items-center gap-1.5 rounded-lg bg-ink px-3 text-sm font-medium text-surface transition-opacity hover:opacity-90"
          >
            <Plus className="size-4" />
            Nova rodada
          </button>
        </div>

        {rodadaSel && (
          <div className="mt-3">
            <p className="mb-1.5 text-xs text-muted">
              {rodadaSel.status === "aberta"
                ? "Link público desta rodada (divulgue no comunicado interno / intranet):"
                : "Rodada fechada — o link não aceita novas respostas."}
            </p>
            <LinkPublico caminho={`/clima/${rodadaSel.slug}`} />
          </div>
        )}
      </div>

      {carregandoDash || !dash ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="skeleton h-40" />
          <div className="skeleton h-40" />
        </div>
      ) : dash.total === 0 ? (
        <p className="card px-6 py-16 text-center text-sm text-muted">
          Ainda sem respostas nesta rodada. Divulgue o link acima para começar a receber.
        </p>
      ) : (
        <Dashboard dash={dash} />
      )}

      {novaAberta && (
        <NovaRodadaModal
          onFechar={() => setNovaAberta(false)}
          onCriada={(id) => {
            setSel(id);
            setNovaAberta(false);
          }}
        />
      )}
    </div>
  );
}

function Dashboard({ dash }: { dash: ClimaDashboard }) {
  return (
    <div className="space-y-4">
      {/* eNPS + breakdown */}
      <div className="grid gap-3 sm:grid-cols-4">
        <div className="card flex flex-col justify-center p-5">
          <p className="text-xs text-muted">eNPS</p>
          {dash.enps ? (
            <p className={clsx("mt-1 text-4xl font-bold tnum", corScore(dash.enps.score))}>
              {dash.enps.score > 0 ? "+" : ""}
              {dash.enps.score}
            </p>
          ) : (
            <p className="mt-1 text-4xl font-bold text-muted">—</p>
          )}
          <p className="mt-1 text-xs text-muted">{num(dash.total)} respostas</p>
        </div>
        <Tile rotulo="Promotores" valor={dash.enps?.promotores ?? 0} tom="text-good" sub="notas 9–10" />
        <Tile rotulo="Neutros" valor={dash.enps?.neutros ?? 0} tom="text-warning" sub="notas 7–8" />
        <Tile rotulo="Detratores" valor={dash.enps?.detratores ?? 0} tom="text-critical" sub="notas 0–6" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Distribuição da recomendação */}
        <ChartCard titulo="Distribuição da recomendação" subtitulo="Quantas pessoas deram cada nota (0–10)">
          <div className="h-64 w-full">
            <ResponsiveContainer>
              <BarChart data={dash.distribuicao} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="var(--grid)" strokeWidth={1} />
                <XAxis
                  dataKey="nota"
                  tick={{ fill: "var(--muted)", fontSize: 11 }}
                  axisLine={{ stroke: "var(--baseline)" }}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fill: "var(--muted)", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  width={28}
                />
                <Tooltip
                  cursor={{ fill: "var(--surface-2)", opacity: 0.6 }}
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const p = payload[0].payload as { nota: number; qtd: number };
                    return (
                      <TooltipContainer>
                        <TooltipLinha cor={corNota(p.nota)} nome={`Nota ${p.nota}`} valor={`${num(p.qtd)}`} />
                      </TooltipContainer>
                    );
                  }}
                />
                <Bar dataKey="qtd" radius={[4, 4, 0, 0]} maxBarSize={40} animationDuration={500}>
                  {dash.distribuicao.map((d) => (
                    <Cell key={d.nota} fill={corNota(d.nota)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        {/* Média por tema (barras CSS) */}
        <ChartCard titulo="Média por tema" subtitulo="Nota de 1 a 5 em cada aspecto">
          <div className="space-y-3 pt-1">
            {dash.temas.map((t) => (
              <div key={t.id}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="text-ink-2">{t.rotulo}</span>
                  <span className="tnum font-semibold text-ink">
                    {t.media == null ? "—" : t.media.toFixed(1)}
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-surface-2">
                  <div
                    className="h-full rounded-full bg-ent"
                    style={{ width: t.media == null ? "0%" : `${(t.media / 5) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>

      {/* Tendência entre rodadas (só faz sentido com 2+) */}
      {dash.tendencia.filter((t) => t.total > 0).length > 1 && (
        <ChartCard titulo="Tendência do eNPS" subtitulo="Evolução entre as rodadas de avaliação">
          <div className="h-56 w-full">
            <ResponsiveContainer>
              <LineChart data={dash.tendencia} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="var(--grid)" strokeWidth={1} />
                <XAxis
                  dataKey="titulo"
                  tick={{ fill: "var(--muted)", fontSize: 11 }}
                  axisLine={{ stroke: "var(--baseline)" }}
                  tickLine={false}
                  tickFormatter={(v: string) => (v.length > 16 ? v.slice(0, 15) + "…" : v)}
                />
                <YAxis
                  domain={[-100, 100]}
                  tick={{ fill: "var(--muted)", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  width={36}
                />
                <Tooltip
                  cursor={{ stroke: "var(--baseline)", strokeWidth: 1 }}
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null;
                    const p = payload[0].payload as { enps: number | null; total: number };
                    return (
                      <TooltipContainer>
                        <p className="mb-1 text-xs font-medium text-ink">{String(label)}</p>
                        <TooltipLinha cor="var(--ent)" nome="eNPS" valor={p.enps == null ? "—" : `${p.enps}`} />
                        <TooltipLinha nome="Respostas" valor={num(p.total)} />
                      </TooltipContainer>
                    );
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="enps"
                  stroke="var(--ent)"
                  strokeWidth={2}
                  dot={{ r: 3, fill: "var(--ent)" }}
                  activeDot={{ r: 5, stroke: "var(--surface)", strokeWidth: 2 }}
                  connectNulls
                  animationDuration={500}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      )}

      {/* Recorte por setor (só com N mínimo) */}
      {dash.porSetor.length > 0 && (
        <ChartCard titulo="Por setor" subtitulo="Só setores com respostas suficientes para preservar o anonimato">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-hairline text-left text-xs text-muted">
                  <th className="py-2 pr-4 font-medium">Setor</th>
                  <th className="py-2 pr-4 font-medium">Respostas</th>
                  <th className="py-2 pr-4 font-medium">eNPS</th>
                  <th className="py-2 font-medium">Média temas</th>
                </tr>
              </thead>
              <tbody>
                {dash.porSetor.map((s) => (
                  <tr key={s.setor} className="border-b border-hairline/60 last:border-0">
                    <td className="py-2 pr-4 text-ink-2">{s.setor}</td>
                    <td className="py-2 pr-4 tnum text-ink-2">{s.respostas}</td>
                    <td className={clsx("py-2 pr-4 tnum font-semibold", s.enps == null ? "text-muted" : corScore(s.enps))}>
                      {s.enps == null ? "—" : s.enps}
                    </td>
                    <td className="py-2 tnum text-ink-2">{s.mediaGeral == null ? "—" : s.mediaGeral.toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ChartCard>
      )}

      {/* Comentários */}
      {dash.comentarios.length > 0 && (
        <ChartCard titulo="Comentários" subtitulo={`${dash.comentarios.length} pessoas deixaram um comentário`}>
          <div className="max-h-96 space-y-3 overflow-y-auto pt-1">
            {dash.comentarios.map((c, i) => (
              <div key={i} className="rounded-lg border border-hairline/60 p-3">
                <div className="mb-1 flex items-center gap-2 text-xs">
                  <span
                    className={clsx(
                      "rounded px-1.5 py-0.5 font-medium",
                      c.nota >= 9 ? "bg-good/12 text-good" : c.nota >= 7 ? "bg-warning/12 text-warning" : "bg-critical/12 text-critical"
                    )}
                  >
                    Recomendação {c.nota}
                  </span>
                  {c.setor && <span className="text-muted">{c.setor}</span>}
                </div>
                <p className="whitespace-pre-wrap text-sm text-ink-2">{c.comentario}</p>
              </div>
            ))}
          </div>
        </ChartCard>
      )}
    </div>
  );
}

function Tile({ rotulo, valor, tom, sub }: { rotulo: string; valor: number; tom?: string; sub?: string }) {
  return (
    <div className="card p-4">
      <p className="text-xs text-muted">{rotulo}</p>
      <p className={clsx("mt-1 text-2xl font-semibold tnum", tom ?? "text-ink")}>{num(valor)}</p>
      {sub && <p className="text-[11px] text-muted">{sub}</p>}
    </div>
  );
}

function NovaRodadaModal({ onFechar, onCriada }: { onFechar: () => void; onCriada: (id: number) => void }) {
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [salvando, setSalvando] = useState(false);
  const qc = useQueryClient();

  const criar = async () => {
    if (!titulo.trim()) return toast.error("Dê um título à rodada");
    setSalvando(true);
    try {
      const r = await mutar<{ id: number; slug: string }>("/api/rh/clima", "POST", { titulo, descricao: descricao || null });
      qc.invalidateQueries({ queryKey: ["rh-clima-rodadas"] });
      toast.success("Rodada criada");
      onCriada(r.id);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao criar");
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Modal aberto onFechar={onFechar} titulo="Nova rodada de avaliação" largura="max-w-lg">
      <div className="space-y-4 px-6 py-5">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-ink-2">Título *</span>
          <input
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            className={clsx(CAMPO, "w-full")}
            placeholder="Ex.: Avaliação da empresa — 2º semestre 2026"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-ink-2">Descrição (opcional)</span>
          <textarea
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-hairline bg-surface px-3 py-2 text-sm outline-none focus:border-ink/30"
            placeholder="Texto que aparece no topo do formulário público."
          />
        </label>
        <p className="text-xs text-muted">
          A rodada usa os temas padrão (liderança, ambiente, remuneração, carga, reconhecimento, comunicação) e já
          nasce aberta, com um link público próprio.
        </p>
        <div className="flex justify-end gap-2">
          <button onClick={onFechar} className="h-9 rounded-lg border border-hairline px-4 text-sm text-ink-2 hover:text-ink">
            Cancelar
          </button>
          <button
            onClick={criar}
            disabled={salvando}
            className="flex h-9 items-center gap-2 rounded-lg bg-ink px-4 text-sm font-medium text-surface transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {salvando && <Loader2 className="size-4 animate-spin" />}
            Criar rodada
          </button>
        </div>
      </div>
    </Modal>
  );
}
