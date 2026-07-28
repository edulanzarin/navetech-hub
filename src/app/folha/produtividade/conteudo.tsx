"use client";

import { useMemo, useState } from "react";
import { CalendarClock, FileMinus, LogOut, Plane, UserPlus } from "lucide-react";
import clsx from "clsx";
import { DpRankingTabela } from "@/components/dp-ranking-tabela";
import { DpListaTabela } from "@/components/dp-lista-tabela";
import { useFiltros } from "@/hooks/use-filters";
import { useDpProdutividade, useDpLista } from "@/hooks/use-api";
import { num, deltaPct } from "@/lib/format";
import { DP_TIPOS, type DpTipo } from "@/lib/dp-tipos";

const ICONE: Record<DpTipo | "total", React.ReactNode> = {
  total: <CalendarClock className="size-4 text-ink-2" />,
  avisos: <FileMinus className="size-4 text-warning" />,
  rescisoes: <LogOut className="size-4 text-critical" />,
  admissoes: <UserPlus className="size-4 text-ent" />,
  ferias: <Plane className="size-4 text-sai" />,
};

function Delta({ atual, anterior }: { atual: number; anterior: number }) {
  const d = deltaPct(atual, anterior);
  if (d == null) return <span className="text-muted">sem base anterior</span>;
  const zero = Math.abs(d) < 0.05;
  return (
    <span className={clsx(zero ? "text-muted" : d > 0 ? "text-ent" : "text-critical")}>
      {zero ? "estável" : `${d > 0 ? "+" : ""}${d.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}% vs. anterior`}
    </span>
  );
}

function Kpi({
  rotulo,
  icone,
  corIcone,
  valor,
  secundario,
}: {
  rotulo: string;
  icone: React.ReactNode;
  corIcone: string;
  valor: string;
  secundario: React.ReactNode;
}) {
  return (
    <div className="card anim-fade-up flex flex-col gap-2 p-5">
      <div className="flex items-center justify-between">
        <p className="text-xs text-ink-2">{rotulo}</p>
        <span className={clsx("grid size-8 place-items-center rounded-lg", corIcone)}>{icone}</span>
      </div>
      <p className="text-3xl font-semibold tracking-tight">{valor}</p>
      <p className="text-xs">{secundario}</p>
    </div>
  );
}

export default function ProdutividadeDpPage() {
  const { qs } = useFiltros();
  const [aba, setAba] = useState<DpTipo>("avisos");
  const [usuarioSel, setUsuarioSel] = useState<number | null>(null);

  const resumo = useDpProdutividade(qs);

  // A lista respeita o colaborador selecionado no ranking (append usuario).
  const listaQs = usuarioSel != null ? `${qs}&usuario=${usuarioSel}` : qs;
  const lista = useDpLista(listaQs, aba);

  const t = resumo.data?.totais;
  const ant = resumo.data?.anterior;
  const carregandoResumo = resumo.isLoading;

  const nomeSel = useMemo(
    () => (usuarioSel != null ? resumo.data?.ranking.find((c) => c.codigo === usuarioSel)?.nome : null),
    [usuarioSel, resumo.data]
  );

  return (
    <>
      {/* KPIs — os quatro trabalhos + total, com delta vs. período anterior */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {carregandoResumo || !t || !ant ? (
          Array.from({ length: 5 }).map((_, i) => <div key={i} className="skeleton h-36" />)
        ) : (
          <>
            <Kpi
              rotulo="Avisos prévios"
              icone={ICONE.avisos}
              corIcone="bg-warning/12"
              valor={num(t.avisos)}
              secundario={<Delta atual={t.avisos} anterior={ant.avisos} />}
            />
            <Kpi
              rotulo="Rescisões calculadas"
              icone={ICONE.rescisoes}
              corIcone="bg-critical/12"
              valor={num(t.rescisoes)}
              secundario={<Delta atual={t.rescisoes} anterior={ant.rescisoes} />}
            />
            <Kpi
              rotulo="Admissões feitas"
              icone={ICONE.admissoes}
              corIcone="bg-ent/12"
              valor={num(t.admissoes)}
              secundario={<Delta atual={t.admissoes} anterior={ant.admissoes} />}
            />
            <Kpi
              rotulo="Férias calculadas"
              icone={ICONE.ferias}
              corIcone="bg-sai/12"
              valor={num(t.ferias)}
              secundario={<Delta atual={t.ferias} anterior={ant.ferias} />}
            />
            <Kpi
              rotulo="Total no período"
              icone={ICONE.total}
              corIcone="bg-surface-2"
              valor={num(t.total)}
              secundario={
                <span className="text-muted">
                  {num(resumo.data!.colaboradores)} colaboradores do DP
                </span>
              }
            />
          </>
        )}
      </div>

      {/* Ranking por colaborador */}
      <DpRankingTabela
        dados={resumo.data?.ranking}
        carregando={resumo.isLoading}
        recarregando={resumo.isFetching && !resumo.isLoading}
        selecionado={usuarioSel}
        onSelecionar={setUsuarioSel}
      />

      {/* Detalhe: abas dos quatro trabalhos, agrupado por colaborador do DP */}
      <section className="card anim-fade-up p-5">
        <p className="mb-3 text-xs text-muted">
          Detalhe agrupado por colaborador do DP — cada bloco é quem fez o trabalho, com os
          registros embaixo. Clique num colaborador do ranking acima para ver só ele.
        </p>
        <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {DP_TIPOS.map((tp) => (
              <button
                key={tp.id}
                onClick={() => setAba(tp.id)}
                className={clsx(
                  "flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs transition-colors",
                  aba === tp.id
                    ? "border-ent/30 bg-ent/12 font-medium text-ent"
                    : "border-hairline bg-surface-2 text-muted hover:text-ink"
                )}
              >
                {ICONE[tp.id]}
                {tp.rotulo}
              </button>
            ))}
          </div>
          {usuarioSel != null && (
            <button
              onClick={() => setUsuarioSel(null)}
              className="rounded-lg border border-hairline bg-surface-2 px-3 py-1.5 text-xs text-muted transition-colors hover:text-ink"
            >
              Filtrando por <span className="font-medium text-ink">{nomeSel}</span> · limpar ✕
            </button>
          )}
        </header>

        <DpListaTabela
          tipo={aba}
          dados={lista.data}
          carregando={lista.isLoading}
          recarregando={lista.isFetching && !lista.isLoading}
        />
      </section>
    </>
  );
}
