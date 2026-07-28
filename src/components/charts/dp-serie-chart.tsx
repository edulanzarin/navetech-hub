"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { DpQuebra } from "@/lib/dp-tipos";
import { dataBR, mesBR, num, numCompact } from "@/lib/format";
import { ChartCard, TooltipContainer, TooltipLinha } from "@/components/ui/chart-card";

interface Props {
  titulo: string;
  dados: DpQuebra | undefined;
  cor: string;
  carregando: boolean;
  recarregando: boolean;
}

interface TooltipProps {
  active?: boolean;
  label?: string;
  payload?: { payload: { bucket: string; qtd: number } }[];
  granularidade: "dia" | "mes";
  cor: string;
}

function TooltipSerie({ active, label, payload, granularidade, cor }: TooltipProps) {
  if (!active || !payload?.length || !label) return null;
  const p = payload[0].payload;
  return (
    <TooltipContainer>
      <p className="mb-1 text-xs font-medium text-ink">
        {granularidade === "mes" ? mesBR(label) : dataBR(label)}
      </p>
      <TooltipLinha cor={cor} nome="Registros" valor={num(p.qtd)} />
    </TooltipContainer>
  );
}

export function DpSerieChart({ titulo, dados, cor, carregando, recarregando }: Props) {
  const granularidade = dados?.granularidade ?? "dia";

  return (
    <ChartCard
      titulo={titulo}
      subtitulo={`Registros lançados por ${granularidade === "mes" ? "mês" : "dia"} no período`}
      carregando={carregando || !dados}
      recarregando={recarregando}
      alturaSkeleton="h-72"
    >
      {dados && dados.serie.length === 0 ? (
        <p className="grid h-40 place-items-center text-sm text-muted">Sem registros no período</p>
      ) : (
        <div className="h-72 w-full">
          <ResponsiveContainer>
            <AreaChart data={dados?.serie ?? []} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
              <defs>
                <linearGradient id="dp-serie-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={cor} stopOpacity={0.22} />
                  <stop offset="100%" stopColor={cor} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="var(--grid)" strokeWidth={1} />
              <XAxis
                dataKey="bucket"
                tickFormatter={(v: string) =>
                  granularidade === "mes" ? mesBR(v) : dataBR(v).slice(0, 5)
                }
                tick={{ fill: "var(--muted)", fontSize: 11 }}
                axisLine={{ stroke: "var(--baseline)" }}
                tickLine={false}
                minTickGap={28}
              />
              <YAxis
                tickFormatter={(v: number) => numCompact(v)}
                tick={{ fill: "var(--muted)", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width={48}
                allowDecimals={false}
              />
              <Tooltip
                content={<TooltipSerie granularidade={granularidade} cor={cor} />}
                cursor={{ stroke: "var(--baseline)", strokeWidth: 1 }}
              />
              <Area
                type="monotone"
                dataKey="qtd"
                stroke={cor}
                strokeWidth={2}
                fill="url(#dp-serie-fill)"
                activeDot={{ r: 4, stroke: "var(--surface)", strokeWidth: 2 }}
                animationDuration={500}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </ChartCard>
  );
}
