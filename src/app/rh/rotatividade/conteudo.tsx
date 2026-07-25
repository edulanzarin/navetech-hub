"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Repeat, UserMinus, UserPlus, Users } from "lucide-react";
import clsx from "clsx";
import { TurnoverSerieChart } from "@/components/charts/turnover-serie-chart";
import { RotatividadeQuebra } from "@/components/rotatividade-quebra";
import { RotatividadeBarras } from "@/components/rotatividade-barras";
import { FolhaMovimentacoes } from "@/components/folha-movimentacoes";
import { PessoasModal, type Drill } from "@/components/folha-pessoas-modal";
import { useTurnover } from "@/hooks/use-api";
import { EMPRESAS_RH, nomeEmpresaRh } from "@/lib/rh";
import { deltaPct, num } from "@/lib/format";

type FiltroEmpresa = "todas" | number;

const pct = (v: number) => `${v.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`;
const anos = (dias: number | null) =>
  dias == null ? "—" : `${(dias / 365).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} anos`;

/** ISO de hoje e de N meses atrás (para o período). */
function isoHoje(): string {
  return new Date().toISOString().slice(0, 10);
}
function isoMesesAtras(n: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  return d.toISOString().slice(0, 10);
}

function Delta({
  atual,
  anterior,
  sentido,
}: {
  atual: number;
  anterior: number;
  sentido: "menorMelhor" | "maiorMelhor" | "neutro";
}) {
  const d = deltaPct(atual, anterior);
  if (d === null || Math.abs(d) < 0.05) {
    return <span className="text-muted">estável vs. anterior</span>;
  }
  const subiu = d > 0;
  const bom = sentido === "neutro" ? null : sentido === "menorMelhor" ? !subiu : subiu;
  const Icone = subiu ? ArrowUp : ArrowDown;
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-0.5 font-medium",
        bom === null ? "text-ink-2" : bom ? "text-good" : "text-critical"
      )}
    >
      <Icone className="size-3" />
      {Math.abs(d).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}% vs. anterior
    </span>
  );
}

function Kpi({
  rotulo,
  icone,
  corIcone,
  estiloIcone,
  valor,
  secundario,
}: {
  rotulo: string;
  icone: React.ReactNode;
  corIcone?: string;
  estiloIcone?: React.CSSProperties;
  valor: string;
  secundario: React.ReactNode;
}) {
  return (
    <div className="card anim-fade-up flex flex-col gap-2 p-5">
      <div className="flex items-center justify-between">
        <p className="text-xs text-ink-2">{rotulo}</p>
        <span className={clsx("grid size-8 place-items-center rounded-lg", corIcone)} style={estiloIcone}>
          {icone}
        </span>
      </div>
      <p className="text-3xl font-semibold tracking-tight">{valor}</p>
      <p className="text-xs text-muted">{secundario}</p>
    </div>
  );
}

function Stat({ rotulo, valor, cor }: { rotulo: string; valor: string; cor?: string }) {
  return (
    <div className="card flex flex-col gap-1 p-4">
      <p className="text-[11px] uppercase tracking-wide text-muted">{rotulo}</p>
      <p className={clsx("text-xl font-semibold tracking-tight", cor)}>{valor}</p>
    </div>
  );
}

const PRESETS: { rotulo: string; meses: number }[] = [
  { rotulo: "3 meses", meses: 3 },
  { rotulo: "6 meses", meses: 6 },
  { rotulo: "12 meses", meses: 12 },
];

export default function Conteudo() {
  const [empresa, setEmpresa] = useState<FiltroEmpresa>("todas");
  const [inicio, setInicio] = useState(() => isoMesesAtras(12));
  const [fim, setFim] = useState(() => isoHoje());
  const [presetAtivo, setPresetAtivo] = useState(12);

  const empresasParam = empresa === "todas" ? EMPRESAS_RH.join(",") : String(empresa);
  const qs = `inicio=${inicio}&fim=${fim}&empresas=${empresasParam}`;

  const turnover = useTurnover(qs, true, "rh");
  const d = turnover.data;
  const c = d?.consolidado;
  const carregando = turnover.isLoading;
  const recarregando = turnover.isFetching && !turnover.isLoading;

  const motivos = useMemo(() => d?.motivos, [d]);
  const tenure = useMemo(() => d?.tenure, [d]);

  const [drill, setDrill] = useState<Drill | null>(null);
  const abrirDrill = (dim: string, valor: string, rotulo: string) => setDrill({ dim, valor, rotulo });

  const aplicarPreset = (meses: number) => {
    setPresetAtivo(meses);
    setInicio(isoMesesAtras(meses));
    setFim(isoHoje());
  };

  const empresaSeg: { valor: FiltroEmpresa; rotulo: string }[] = [
    { valor: "todas", rotulo: "Ambas" },
    ...EMPRESAS_RH.map((cod) => ({ valor: cod as FiltroEmpresa, rotulo: nomeEmpresaRh(cod) })),
  ];

  return (
    <>
      {/* Controles: empresa + período */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-lg border border-hairline bg-surface p-0.5">
          {empresaSeg.map((s) => (
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

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg border border-hairline bg-surface p-0.5">
            {PRESETS.map((p) => (
              <button
                key={p.meses}
                onClick={() => aplicarPreset(p.meses)}
                className={clsx(
                  "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                  presetAtivo === p.meses ? "bg-surface-2 text-ink" : "text-muted hover:text-ink"
                )}
              >
                {p.rotulo}
              </button>
            ))}
          </div>
          <input
            type="date"
            value={inicio}
            max={fim}
            onChange={(e) => {
              setInicio(e.target.value);
              setPresetAtivo(0);
            }}
            className="h-8 rounded-lg border border-hairline bg-surface px-2 text-xs text-ink-2 outline-none focus:border-ink/30"
          />
          <span className="text-xs text-muted">até</span>
          <input
            type="date"
            value={fim}
            min={inicio}
            max={isoHoje()}
            onChange={(e) => {
              setFim(e.target.value);
              setPresetAtivo(0);
            }}
            className="h-8 rounded-lg border border-hairline bg-surface px-2 text-xs text-ink-2 outline-none focus:border-ink/30"
          />
        </div>
      </div>

      {turnover.error && (
        <p className="text-sm text-critical">
          {turnover.error instanceof Error ? turnover.error.message : "Falha ao carregar"}
        </p>
      )}

      {/* KPIs principais */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {carregando || !c ? (
          Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-36" />)
        ) : (
          <>
            <Kpi
              rotulo="Turnover geral"
              icone={<Repeat className="size-4" style={{ color: "var(--esp-5)" }} />}
              estiloIcone={{ backgroundColor: "color-mix(in srgb, var(--esp-5) 12%, transparent)" }}
              valor={pct(c.turnover)}
              secundario={<Delta atual={c.turnover} anterior={d!.anterior.turnover} sentido="menorMelhor" />}
            />
            <Kpi
              rotulo="Admissões"
              icone={<UserPlus className="size-4 text-good" />}
              corIcone="bg-good/12"
              valor={num(c.admissoes)}
              secundario={<Delta atual={c.admissoes} anterior={d!.anterior.admissoes} sentido="neutro" />}
            />
            <Kpi
              rotulo="Desligamentos"
              icone={<UserMinus className="size-4 text-critical" />}
              corIcone="bg-critical/12"
              valor={num(c.desligamentos)}
              secundario={
                <Delta atual={c.desligamentos} anterior={d!.anterior.desligamentos} sentido="menorMelhor" />
              }
            />
            <Kpi
              rotulo="Colaboradores ativos"
              icone={<Users className="size-4 text-ink-2" />}
              corIcone="bg-surface-2"
              valor={num(c.ativos)}
              secundario={<Delta atual={c.ativos} anterior={d!.anterior.ativos} sentido="maiorMelhor" />}
            />
          </>
        )}
      </div>

      {/* Métricas secundárias */}
      {!carregando && c && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Stat
            rotulo="Saldo de pessoal"
            valor={`${c.saldo > 0 ? "+" : ""}${num(c.saldo)}`}
            cor={c.saldo > 0 ? "text-good" : c.saldo < 0 ? "text-critical" : undefined}
          />
          <Stat rotulo="Deslig. voluntários" valor={num(c.voluntarios)} />
          <Stat rotulo="Deslig. involuntários" valor={num(c.involuntarios)} />
          <Stat rotulo="Tempo médio de casa" valor={anos(c.tempoMedioCasaDias)} />
        </div>
      )}

      {/* Tendência */}
      {(carregando || (d && d.serie.length >= 2)) && (
        <TurnoverSerieChart dados={d?.serie} carregando={carregando} recarregando={recarregando} />
      )}

      {/* Movimentações + ficha (empresa vem da linha) */}
      <FolhaMovimentacoes qs={qs} modulo="rh" />

      {/* Desligados */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <RotatividadeBarras
          titulo="Motivo do desligamento"
          subtitulo="Causa da rescisão · clique para ver quem saiu"
          dados={motivos}
          cor="var(--critical)"
          vazio="Nenhum desligamento no período"
          carregando={carregando}
          recarregando={recarregando}
          dim="motivo"
          onDrill={abrirDrill}
        />
        <RotatividadeBarras
          titulo="Tempo de casa dos desligados"
          subtitulo="Quanto tempo ficou quem saiu · clique para ver quem"
          dados={tenure}
          cor="var(--esp-5)"
          vazio="Nenhum desligamento no período"
          carregando={carregando}
          recarregando={recarregando}
          dim="tempoCasa"
          onDrill={abrirDrill}
        />
      </div>

      {/* Quebras */}
      <RotatividadeQuebra
        titulo="Turnover por setor"
        subtitulo="Cada setor com efetivo e movimentação · clique numa linha para ver as pessoas"
        rotuloColuna="Setor"
        dados={d?.organogramas}
        total={c}
        carregando={carregando}
        recarregando={recarregando}
        dim="setor"
        onDrill={abrirDrill}
      />
      <RotatividadeQuebra
        titulo="Turnover por cargo"
        subtitulo="Cada cargo com efetivo e movimentação · clique numa linha para ver as pessoas"
        rotuloColuna="Cargo"
        dados={d?.cargos}
        total={c}
        carregando={carregando}
        recarregando={recarregando}
        dim="cargo"
        onDrill={abrirDrill}
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="md:col-span-2">
          <RotatividadeQuebra
            titulo="Turnover por faixa etária"
            subtitulo="Onde a rotatividade se concentra por idade · clique para ver as pessoas"
            rotuloColuna="Faixa etária"
            dados={d?.faixaEtaria}
            total={c}
            carregando={carregando}
            recarregando={recarregando}
            dim="faixaEtaria"
            onDrill={abrirDrill}
            compacto
          />
        </div>
        <RotatividadeQuebra
          titulo="Turnover por estabelecimento"
          subtitulo="Por filial · clique para ver as pessoas"
          rotuloColuna="Estabelecimento"
          dados={d?.estabelecimentos}
          total={c}
          carregando={carregando}
          recarregando={recarregando}
          dim="estab"
          onDrill={abrirDrill}
          compacto
        />
        <RotatividadeQuebra
          titulo="Turnover por sexo"
          subtitulo="Rotatividade por sexo · clique para ver as pessoas"
          rotuloColuna="Sexo"
          dados={d?.sexo}
          total={c}
          carregando={carregando}
          recarregando={recarregando}
          dim="sexo"
          onDrill={abrirDrill}
          compacto
        />
        <RotatividadeQuebra
          titulo="Turnover por escolaridade"
          subtitulo="Rotatividade por grau de instrução · clique para ver as pessoas"
          rotuloColuna="Escolaridade"
          dados={d?.escolaridade}
          total={c}
          carregando={carregando}
          recarregando={recarregando}
          dim="escolaridade"
          onDrill={abrirDrill}
          compacto
        />
      </div>

      <p className="text-[11px] text-muted">
        Turnover = (admissões + desligamentos) ÷ 2, sobre os colaboradores ativos
        (efetivo no fim do período), só das empresas NAVECON e FOUR. Clique em
        qualquer quebra para ver as pessoas.
      </p>

      <PessoasModal qsBase={qs} drill={drill} onFechar={() => setDrill(null)} modulo="rh" />
    </>
  );
}
