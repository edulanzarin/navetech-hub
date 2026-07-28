"use client";

import { useMemo } from "react";
import clsx from "clsx";
import type { DpLinha, DpTipo, EsocialStatus } from "@/lib/dp-tipos";
import { dataBR, num } from "@/lib/format";

/** "YYYY-MM-DDTHH:MM:SS" → "dd/mm/aaaa HH:MM" (sem depender de fuso). */
function dataHoraBR(iso: string | null | undefined): string {
  if (!iso) return "—";
  const [data, hora] = iso.split("T");
  return `${dataBR(data)} ${(hora ?? "").slice(0, 5)}`.trim();
}

function EsocialBadge({ status }: { status: EsocialStatus | undefined }) {
  const mapa: Record<EsocialStatus, { rotulo: string; cor: string }> = {
    ok: { rotulo: "Transmitida", cor: "bg-ent/12 text-ent" },
    pendente: { rotulo: "Pendente", cor: "bg-warning/12 text-warning" },
    nao_enviado: { rotulo: "Não enviada", cor: "bg-surface-2 text-muted" },
  };
  const s = mapa[status ?? "nao_enviado"];
  return (
    <span className={clsx("rounded px-1.5 py-0.5 text-[11px] font-medium", s.cor)}>{s.rotulo}</span>
  );
}

interface Coluna {
  rotulo: string;
  /** Alinhamento; padrão à esquerda. */
  fim?: boolean;
  render: (l: DpLinha) => React.ReactNode;
}

function empresaCell(l: DpLinha) {
  return (
    <div className="flex flex-col">
      <span className="truncate text-ink-2">{l.empresa}</span>
      <span className="text-[11px] tabular-nums text-muted">{l.codigoempresa}</span>
    </div>
  );
}

/**
 * Colunas por tipo. O colaborador do DP NÃO é coluna: ele é o cabeçalho do grupo
 * (a tela é por colaborador). Cada linha mostra o funcionário e a empresa do
 * registro que aquele colaborador processou.
 */
function colunas(tipo: DpTipo): Coluna[] {
  const funcionario: Coluna = {
    rotulo: "Funcionário",
    render: (l) => <span className="text-ink">{l.funcionario}</span>,
  };
  const empresa: Coluna = { rotulo: "Empresa", render: empresaCell };

  if (tipo === "avisos" || tipo === "rescisoes") {
    return [
      funcionario,
      empresa,
      { rotulo: "Causa da demissão", render: (l) => l.causa ?? "—" },
      { rotulo: "Data do aviso", render: (l) => dataBR(l.dataAviso) },
      { rotulo: "Data da rescisão", render: (l) => dataBR(l.dataResc) },
      {
        rotulo: tipo === "avisos" ? "Cadastrado em" : "Calculada em",
        fim: true,
        render: (l) => <span className="tabular-nums text-muted">{dataHoraBR(l.quando)}</span>,
      },
    ];
  }

  if (tipo === "admissoes") {
    return [
      funcionario,
      empresa,
      { rotulo: "Data de admissão", render: (l) => dataBR(l.dataAdm) },
      { rotulo: "eSocial", render: (l) => <EsocialBadge status={l.esocial} /> },
      { rotulo: "Origem", render: (l) => l.origem ?? "—" },
      {
        rotulo: "Lançada em",
        fim: true,
        render: (l) => <span className="tabular-nums text-muted">{dataHoraBR(l.quando)}</span>,
      },
    ];
  }

  // férias
  return [
    funcionario,
    empresa,
    { rotulo: "Início do gozo", render: (l) => dataBR(l.inicioFerias) },
    { rotulo: "Fim do gozo", render: (l) => dataBR(l.fimFerias) },
    { rotulo: "Período aquisitivo", render: (l) => dataBR(l.periodoAquisitivo) },
    { rotulo: "Pagamento", render: (l) => dataBR(l.dataPgto) },
    {
      rotulo: "Calculada em",
      fim: true,
      render: (l) => <span className="tabular-nums text-muted">{dataHoraBR(l.quando)}</span>,
    },
  ];
}

interface Grupo {
  codigousuario: number;
  usuario: string;
  linhas: DpLinha[];
}

/** Agrupa por colaborador do DP e ordena os grupos pelo volume (mais fez primeiro). */
function agrupar(dados: DpLinha[]): Grupo[] {
  const mapa = new Map<number, Grupo>();
  for (const l of dados) {
    let g = mapa.get(l.codigousuario);
    if (!g) {
      g = { codigousuario: l.codigousuario, usuario: l.usuario, linhas: [] };
      mapa.set(l.codigousuario, g);
    }
    g.linhas.push(l);
  }
  return [...mapa.values()].sort((a, b) => b.linhas.length - a.linhas.length);
}

interface Props {
  tipo: DpTipo;
  dados: DpLinha[] | undefined;
  carregando: boolean;
  recarregando: boolean;
}

export function DpListaTabela({ tipo, dados, carregando, recarregando }: Props) {
  const cols = colunas(tipo);
  const grupos = useMemo(() => (dados ? agrupar(dados) : undefined), [dados]);

  if (carregando || !grupos) return <div className="skeleton h-96 w-full" />;
  if (grupos.length === 0) {
    return (
      <p className="grid h-40 place-items-center text-sm text-muted">Nada lançado no período</p>
    );
  }

  return (
    <div className={clsx("overflow-x-auto", recarregando && "refetching")}>
      <table className="w-full min-w-[820px] border-collapse text-sm">
        <thead className="sticky top-0 z-10 bg-surface">
          <tr className="border-b border-hairline text-xs text-muted">
            {cols.map((c) => (
              <th
                key={c.rotulo}
                className={clsx("py-2 font-medium", c.fim ? "pl-3 text-right" : "pr-3 text-left")}
              >
                {c.rotulo}
              </th>
            ))}
          </tr>
        </thead>
        {grupos.map((g) => (
          <tbody key={g.codigousuario}>
            {/* Cabeçalho do colaborador — o eixo da tela é quem fez o trabalho */}
            <tr className="bg-surface-2/60">
              <td colSpan={cols.length} className="px-1 py-2">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-ink">{g.usuario}</span>
                  <span className="rounded-full bg-ent/12 px-2 py-0.5 text-[11px] font-medium text-ent">
                    {num(g.linhas.length)} {g.linhas.length === 1 ? "registro" : "registros"}
                  </span>
                </div>
              </td>
            </tr>
            {g.linhas.map((l, i) => (
              <tr
                key={`${l.codigoempresa}-${l.contrato}-${i}`}
                className="border-b border-hairline/60 hover:bg-surface-2/50"
              >
                {cols.map((c) => (
                  <td
                    key={c.rotulo}
                    className={clsx("py-2.5 align-top", c.fim ? "pl-3 text-right" : "pr-3")}
                  >
                    {c.render(l)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        ))}
      </table>
      {dados && dados.length >= 1000 && (
        <p className="mt-3 text-center text-xs text-muted">
          Mostrando as 1000 linhas mais recentes — refine o período ou a empresa
        </p>
      )}
    </div>
  );
}
