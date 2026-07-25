"use client";

import { useMemo, useState } from "react";
import { Search, UserRound } from "lucide-react";
import clsx from "clsx";
import { FichaModal, tempoCasa } from "@/components/folha-ficha-modal";
import { SeloEmpresa } from "@/components/rh-selo-empresa";
import { useRhFuncionarios } from "@/hooks/use-api";
import { EMPRESAS_RH, nomeEmpresaRh } from "@/lib/rh";
import { dataBR } from "@/lib/format";
import type { FuncionarioDiretorio } from "@/lib/rh-tipos";

type FiltroEmpresa = "todas" | number;

function diasDeCasa(dataadm: string): number {
  return Math.max(0, Math.floor((Date.now() - Date.parse(dataadm)) / 86_400_000));
}

function normalizar(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export default function Conteudo() {
  const { data, isLoading, isFetching } = useRhFuncionarios();
  const [empresa, setEmpresa] = useState<FiltroEmpresa>("todas");
  const [classif, setClassif] = useState<string | null>(null);
  const [busca, setBusca] = useState("");

  const todos = useMemo(() => data ?? [], [data]);

  const porEmpresa = useMemo(
    () =>
      empresa === "todas" ? todos : todos.filter((f) => f.codigoempresa === empresa),
    [todos, empresa]
  );

  // Setores da seleção de empresa atual (chip = classiforgan), com contagem.
  const setores = useMemo(() => {
    const mapa = new Map<string, { nome: string; qtd: number }>();
    for (const f of porEmpresa) {
      const chave = f.classiforgan ?? "—";
      const atual = mapa.get(chave);
      if (atual) atual.qtd++;
      else mapa.set(chave, { nome: f.setor ?? "(sem setor)", qtd: 1 });
    }
    return [...mapa.entries()]
      .map(([classiforgan, v]) => ({ classiforgan, ...v }))
      .sort((a, b) => b.qtd - a.qtd);
  }, [porEmpresa]);

  const filtrados = useMemo(() => {
    const q = normalizar(busca.trim());
    return porEmpresa.filter((f) => {
      if (classif && (f.classiforgan ?? "—") !== classif) return false;
      if (q && !normalizar(`${f.nome} ${f.cargo ?? ""}`).includes(q)) return false;
      return true;
    });
  }, [porEmpresa, classif, busca]);

  const contagem = useMemo(() => {
    const c: Record<number, number> = {};
    for (const cod of EMPRESAS_RH) c[cod] = 0;
    for (const f of todos) c[f.codigoempresa] = (c[f.codigoempresa] ?? 0) + 1;
    return c;
  }, [todos]);

  const [aberto, setAberto] = useState<FuncionarioDiretorio | null>(null);

  const segmentos: { valor: FiltroEmpresa; rotulo: string; qtd: number }[] = [
    { valor: "todas", rotulo: "Ambas", qtd: todos.length },
    ...EMPRESAS_RH.map((cod) => ({
      valor: cod as FiltroEmpresa,
      rotulo: nomeEmpresaRh(cod),
      qtd: contagem[cod] ?? 0,
    })),
  ];

  return (
    <>
      {/* Controles */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-lg border border-hairline bg-surface p-0.5">
          {segmentos.map((s) => (
            <button
              key={String(s.valor)}
              onClick={() => {
                setEmpresa(s.valor);
                setClassif(null);
              }}
              className={clsx(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                empresa === s.valor ? "bg-surface-2 text-ink" : "text-muted hover:text-ink"
              )}
            >
              {s.rotulo}
              <span className="ml-1.5 tabular-nums text-xs text-muted">{s.qtd}</span>
            </button>
          ))}
        </div>

        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted" />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nome ou cargo…"
            className="h-9 w-64 rounded-lg border border-hairline bg-surface pl-8 pr-3 text-sm outline-none placeholder:text-muted focus:border-ink/30"
          />
        </div>
      </div>

      {/* Chips de setor */}
      {setores.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setClassif(null)}
            className={clsx(
              "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              classif === null
                ? "border-ink/20 bg-surface-2 text-ink"
                : "border-hairline text-muted hover:text-ink"
            )}
          >
            Todos os setores
          </button>
          {setores.map((s) => (
            <button
              key={s.classiforgan}
              onClick={() => setClassif((c) => (c === s.classiforgan ? null : s.classiforgan))}
              className={clsx(
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                classif === s.classiforgan
                  ? "border-ink/20 bg-surface-2 text-ink"
                  : "border-hairline text-muted hover:text-ink"
              )}
            >
              {s.nome}
              <span className="ml-1 tabular-nums text-muted">{s.qtd}</span>
            </button>
          ))}
        </div>
      )}

      {/* Tabela */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between border-b border-hairline px-4 py-2.5">
          <p className="text-sm text-muted">
            {isLoading ? "Carregando…" : `${filtrados.length} funcionário${filtrados.length === 1 ? "" : "s"}`}
          </p>
        </div>
        <div className={clsx("max-h-[38rem] overflow-y-auto overflow-x-auto", isFetching && "refetching")}>
          <table className="w-full min-w-[720px] border-collapse text-sm">
            <thead className="sticky top-0 z-10 bg-surface">
              <tr className="border-b border-hairline text-xs text-muted">
                <th className="py-2 pl-4 pr-3 text-left font-medium">Colaborador</th>
                <th className="py-2 px-3 text-left font-medium">Empresa</th>
                <th className="py-2 px-3 text-left font-medium">Cargo · Setor</th>
                <th className="py-2 px-3 text-right font-medium">Admissão</th>
                <th className="py-2 pl-3 pr-4 text-right font-medium">Tempo de casa</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map((f) => (
                <tr
                  key={`${f.codigoempresa}-${f.contrato}`}
                  onClick={() => setAberto(f)}
                  className="cursor-pointer border-b border-hairline/60 last:border-0 hover:bg-surface-2/50"
                >
                  <td className="py-2.5 pl-4 pr-3">
                    <div className="flex items-center gap-2">
                      <span className="grid size-7 shrink-0 place-items-center rounded-full bg-surface-2 text-muted">
                        <UserRound className="size-3.5" />
                      </span>
                      <span className="font-medium text-ink">{f.nome}</span>
                    </div>
                  </td>
                  <td className="py-2.5 px-3">
                    <SeloEmpresa codigo={f.codigoempresa} />
                  </td>
                  <td className="py-2.5 px-3">
                    <p className="text-ink-2">{f.cargo ?? "—"}</p>
                    <p className="text-[11px] text-muted">{f.setor ?? "—"}</p>
                  </td>
                  <td className="py-2.5 px-3 text-right tabular-nums text-ink-2">{dataBR(f.dataadm)}</td>
                  <td className="py-2.5 pl-3 pr-4 text-right tabular-nums text-ink-2">
                    {tempoCasa(diasDeCasa(f.dataadm))}
                  </td>
                </tr>
              ))}
              {!isLoading && filtrados.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-sm text-muted">
                    Nenhum funcionário no filtro.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <FichaModal
        modulo="rh"
        empresa={aberto?.codigoempresa ?? null}
        contrato={aberto?.contrato ?? null}
        onFechar={() => setAberto(null)}
      />
    </>
  );
}
