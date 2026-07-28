"use client";

import { useMemo, useState } from "react";
import { Check, Search, UserRound } from "lucide-react";
import clsx from "clsx";
import { useQueryClient } from "@tanstack/react-query";
import { Dropdown, ItemLista } from "@/components/ui/dropdown";
import { FichaModal, tempoCasa } from "@/components/folha-ficha-modal";
import { SeloEmpresa } from "@/components/rh-selo-empresa";
import { BotaoExecutar } from "@/components/filters/botao-executar";
import { FiltroPendente } from "@/components/filtro-pendente";
import { useRhFuncionarios, useRhSetores } from "@/hooks/use-api";
import { useEstadoModulo } from "@/hooks/use-estado-modulo";
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
  // Nada consulta até o Visualizar (padrão executar-por-botão): o fetch da lista
  // só dispara depois do clique; empresa/setor/busca filtram no cliente.
  const [aplicado, setAplicado] = useEstadoModulo("rh/diretorio:aplicado", false);
  const { data, isLoading, isFetching } = useRhFuncionarios(aplicado);
  // Lista de setores é METADADO de filtro (lookup leve): carrega sempre, sem o
  // gatilho — assim o dropdown de setor aparece de cara. A contagem por setor
  // depende dos funcionários e só entra depois do Visualizar.
  const { data: setoresLookup } = useRhSetores();
  const queryClient = useQueryClient();
  const [empresa, setEmpresa] = useEstadoModulo<FiltroEmpresa>("rh/diretorio:empresa", "todas");
  const [classif, setClassif] = useEstadoModulo<string | null>("rh/diretorio:classif", null);
  const [busca, setBusca] = useEstadoModulo("rh/diretorio:busca", "");

  const executar = () => {
    setAplicado(true);
    queryClient.invalidateQueries({ queryKey: ["rh-funcionarios"] });
  };

  const todos = useMemo(() => data ?? [], [data]);

  const porEmpresa = useMemo(
    () =>
      empresa === "todas" ? todos : todos.filter((f) => f.codigoempresa === empresa),
    [todos, empresa]
  );

  // Contagem por setor na empresa atual — só faz sentido com os dados carregados.
  const contagemSetor = useMemo(() => {
    const m = new Map<string, number>();
    for (const f of porEmpresa) {
      const k = f.classiforgan ?? "—";
      m.set(k, (m.get(k) ?? 0) + 1);
    }
    return m;
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
    { valor: "todas", rotulo: "Todas", qtd: todos.length },
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
        <div className="flex flex-wrap items-center gap-2">
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
              {data && (
                <span className="ml-1.5 tabular-nums text-xs text-muted">{s.qtd}</span>
              )}
            </button>
          ))}
          </div>

          {/* Setor: dropdown a partir do lookup (aparece de cara, sem esperar o
              Visualizar); a contagem por setor só entra depois de carregar. */}
          {(setoresLookup?.length ?? 0) > 0 && (
            <Dropdown
              rotulo={
                classif === null
                  ? "Todos os setores"
                  : (setoresLookup?.find((s) => s.classiforgan === classif)?.nome ?? classif)
              }
              ativo={classif !== null}
              largura="w-72"
            >
              {(fechar) => (
                <div className="max-h-72 overflow-y-auto py-1">
                  <ItemLista
                    selecionado={classif === null}
                    onClick={() => {
                      setClassif(null);
                      fechar();
                    }}
                  >
                    <span className="grid size-4 place-items-center">
                      {classif === null && <Check className="size-4 stroke-[3] text-ent" />}
                    </span>
                    <span className="flex-1">Todos os setores</span>
                    {data && (
                      <span className="tabular-nums text-xs text-muted">{porEmpresa.length}</span>
                    )}
                  </ItemLista>
                  {setoresLookup!.map((s) => {
                    const n = contagemSetor.get(s.classiforgan);
                    return (
                      <ItemLista
                        key={s.classiforgan}
                        selecionado={classif === s.classiforgan}
                        onClick={() => {
                          setClassif(s.classiforgan);
                          fechar();
                        }}
                      >
                        <span className="grid size-4 place-items-center">
                          {classif === s.classiforgan && (
                            <Check className="size-4 stroke-[3] text-ent" />
                          )}
                        </span>
                        <span className="flex-1 truncate">{s.nome}</span>
                        {data && n != null && (
                          <span className="tabular-nums text-xs text-muted">{n}</span>
                        )}
                      </ItemLista>
                    );
                  })}
                </div>
              )}
            </Dropdown>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted" />
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por nome ou cargo…"
              className="h-9 w-64 rounded-lg border border-hairline bg-surface pl-8 pr-3 text-sm outline-none placeholder:text-muted focus:border-ink/30"
            />
          </div>
          <BotaoExecutar onClick={executar} dirty={!aplicado} rotulo="Visualizar" />
        </div>
      </div>

      {!aplicado ? (
        <FiltroPendente rotulo="Visualizar" />
      ) : (
      <>
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
      </>
      )}

      <FichaModal
        modulo="rh"
        empresa={aberto?.codigoempresa ?? null}
        contrato={aberto?.contrato ?? null}
        onFechar={() => setAberto(null)}
      />
    </>
  );
}
