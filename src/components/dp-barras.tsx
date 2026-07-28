"use client";

import {
  Bar,
  BarChart,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { DpQuebraItem } from "@/lib/dp-tipos";
import { num, numCompact } from "@/lib/format";
import { ChartCard, TooltipContainer, TooltipLinha } from "@/components/ui/chart-card";

interface Props {
  titulo: string;
  subtitulo: string;
  dados: DpQuebraItem[] | undefined;
  /** Cor da barra (CSS var do tipo, ex.: "var(--ent)"). */
  cor: string;
  carregando: boolean;
  recarregando: boolean;
  /** Rótulo do eixo (o que cada barra representa): "Colaborador", "Empresa". */
  rotuloEixo: string;
  /** Máximo de barras (as demais somem — é um top). */
  limite?: number;
  /** Quando clicável: código destacado e callback de toggle (só faz sentido no
   *  eixo colaborador; a empresa não filtra a tela). */
  selecionado?: number | null;
  onSelecionar?: (codigo: number | null) => void;
}

interface TooltipBarraProps {
  active?: boolean;
  payload?: { payload: DpQuebraItem }[];
  cor: string;
  rotuloEixo: string;
}

function TooltipBarra({ active, payload, cor, rotuloEixo }: TooltipBarraProps) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <TooltipContainer>
      <p className="mb-1 max-w-72 text-xs font-medium text-ink">{p.nome}</p>
      <p className="mb-1 text-[11px] text-muted">{rotuloEixo}</p>
      <TooltipLinha cor={cor} nome="Registros" valor={num(p.qtd)} />
    </TooltipContainer>
  );
}

export function DpBarras({
  titulo,
  subtitulo,
  dados,
  cor,
  carregando,
  recarregando,
  rotuloEixo,
  limite = 15,
  selecionado,
  onSelecionar,
}: Props) {
  const clicavel = !!onSelecionar;
  const top = dados ? dados.slice(0, limite) : undefined;
  const altura = Math.max(200, (top?.length ?? 8) * 32);

  return (
    <ChartCard
      titulo={titulo}
      subtitulo={subtitulo}
      carregando={carregando || !top}
      recarregando={recarregando}
      alturaSkeleton="h-80"
    >
      {top && top.length === 0 ? (
        <p className="grid h-40 place-items-center text-sm text-muted">Sem registros no período</p>
      ) : (
        <div style={{ height: altura }} className="w-full">
          <ResponsiveContainer>
            <BarChart
              data={top ?? []}
              layout="vertical"
              margin={{ top: 0, right: 48, left: 0, bottom: 0 }}
              barCategoryGap={8}
            >
              <XAxis type="number" hide />
              <YAxis
                type="category"
                dataKey="nome"
                width={180}
                tick={{ fill: "var(--ink-2)", fontSize: 11 }}
                tickFormatter={(v: string) => (v.length > 26 ? v.slice(0, 25) + "…" : v)}
                axisLine={{ stroke: "var(--baseline)" }}
                tickLine={false}
                interval={0}
              />
              <Tooltip
                content={<TooltipBarra cor={cor} rotuloEixo={rotuloEixo} />}
                cursor={{ fill: "var(--surface-2)", opacity: 0.6 }}
              />
              <Bar
                dataKey="qtd"
                maxBarSize={20}
                radius={[0, 4, 4, 0]}
                animationDuration={500}
                onClick={
                  clicavel
                    ? (d: unknown) => {
                        const cod = (d as DpQuebraItem).codigo;
                        onSelecionar!(cod === selecionado ? null : cod);
                      }
                    : undefined
                }
                className={clicavel ? "cursor-pointer" : undefined}
              >
                {(top ?? []).map((d) => (
                  <Cell
                    key={d.codigo}
                    fill={cor}
                    fillOpacity={selecionado == null || selecionado === d.codigo ? 1 : 0.32}
                  />
                ))}
                <LabelList
                  dataKey="qtd"
                  position="right"
                  formatter={(v) => numCompact(v as number)}
                  style={{ fill: "var(--ink-2)", fontSize: 11 }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </ChartCard>
  );
}
