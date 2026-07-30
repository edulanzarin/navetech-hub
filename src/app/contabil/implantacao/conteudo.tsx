"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Building2, CheckCircle2, Download, FileUp, HelpCircle, Pencil } from "lucide-react";
import clsx from "clsx";
import { toast } from "sonner";
import { ContaDropdown } from "@/components/conta-dropdown";
import { useFiltros } from "@/hooks/use-filters";
import { useEstadoSecao } from "@/hooks/use-estado-secao";
import { brl } from "@/lib/format";
import type { LinhaCasada, StatusCasamento } from "@/lib/implantacao-tipos";

const BADGE: Record<StatusCasamento, { rotulo: string; cor: string; icone: typeof CheckCircle2 }> = {
  casada: { rotulo: "Casada", cor: "bg-good/12 text-good", icone: CheckCircle2 },
  duvidosa: { rotulo: "Confira", cor: "bg-warn/12 text-warn", icone: HelpCircle },
  sem_conta: { rotulo: "Sem conta", cor: "bg-critical/12 text-critical", icone: AlertTriangle },
};

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Falha na operação");
  return data as T;
}

export default function Conteudo() {
  const { filtros } = useFiltros();
  const empresa = filtros.empresas[0];
  const temEmpresa = filtros.empresas.length === 1;

  // Estado da seção (sobrevive à navegação dentro da seção). O PDF é lido pelos
  // controles da barra (ImplantacaoControles), que gravam `casadas` aqui.
  const [casadas, setCasadas] = useEstadoSecao<LinhaCasada[] | null>("casadas", null);
  const [estab, setEstab] = useEstadoSecao<string>("estab", "1");
  const [data, setData] = useEstadoSecao<string>("data", "");
  const [contaImpl, setContaImpl] = useEstadoSecao<number | null>("contaImpl", null);
  const [historico, setHistorico] = useEstadoSecao<string>("historico", "");
  const [complemento, setComplemento] = useEstadoSecao<string>("complemento", "IMPLANTACAO DE SALDOS");

  const [editando, setEditando] = useState<number | null>(null);
  const [ocupado, setOcupado] = useState(false);

  // Prefill dos padrões (conta transitória, histórico) ao trocar de empresa.
  useEffect(() => {
    if (!temEmpresa) return;
    let vivo = true;
    fetch(`/api/contabil/implantacao/config?empresa=${empresa}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((cfg) => {
        if (!vivo || !cfg) return;
        if (cfg.contaImplantacao != null) setContaImpl((v) => v ?? cfg.contaImplantacao);
        if (cfg.codigoHistorico != null) setHistorico((v) => v || String(cfg.codigoHistorico));
        if (cfg.complemento) setComplemento((v) => v || cfg.complemento);
      })
      .catch(() => {});
    return () => {
      vivo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empresa, temEmpresa]);

  const resumo = useMemo(() => {
    const c = casadas ?? [];
    let deb = 0;
    let cred = 0;
    for (const x of c) {
      if (x.natureza === "D") deb += x.origem.saldo;
      else if (x.natureza === "C") cred += x.origem.saldo;
    }
    const semConta = c.filter((x) => x.status === "sem_conta").length;
    return {
      total: c.length,
      casadas: c.filter((x) => x.status === "casada").length,
      duvidosas: c.filter((x) => x.status === "duvidosa").length,
      semConta,
      deb,
      cred,
      // Fecha só quando tudo tem conta (senão falta natureza de alguém).
      fecha: semConta === 0 && Math.abs(deb - cred) < 1,
    };
  }, [casadas]);

  async function escolherConta(idx: number, conta: number | null) {
    if (!casadas) return;
    const linha = casadas[idx];
    const nova = [...casadas];
    nova[idx] = {
      ...linha,
      conta,
      status: conta == null ? "sem_conta" : "casada",
      via: conta == null ? null : "manual",
      confianca: conta == null ? 0 : 1,
      natureza: linha.origem.natureza ?? linha.natureza,
    };
    setCasadas(nova);
    setEditando(null);
    try {
      await postJson("/api/contabil/implantacao/depara", {
        empresa,
        chave: linha.origem.chave,
        descr: linha.origem.descricao,
        conta,
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao salvar de-para");
    }
  }

  async function salvarPadrao() {
    try {
      await fetch("/api/contabil/implantacao/config", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          empresa,
          config: {
            contaImplantacao: contaImpl,
            codigoHistorico: historico ? Number(historico) : null,
            complemento,
          },
        }),
      });
      toast.success("Padrão salvo para esta empresa");
    } catch {
      toast.error("Falha ao salvar padrão");
    }
  }

  async function gerar() {
    if (!casadas) return;
    setOcupado(true);
    try {
      const r = await postJson<{
        arquivo: string;
        linhas: number;
        totalDebito: number;
        totalCredito: number;
        transitoriaZera: boolean;
        semConta: unknown[];
      }>("/api/contabil/implantacao/gerar", {
        empresa,
        estab: Number(estab),
        data,
        contaImplantacao: contaImpl,
        codigoHistorico: historico ? Number(historico) : null,
        complemento,
        linhas: casadas.map((c) => c.origem),
      });
      const blob = new Blob([r.arquivo], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `implantacao_${empresa}_${data}.txt`;
      a.click();
      URL.revokeObjectURL(url);
      if (!r.transitoriaZera) {
        toast.warning(
          `Gerado, mas a transitória não zerou (deb ${brl(r.totalDebito)} × cred ${brl(r.totalCredito)}) — o balancete não fecha`
        );
      } else {
        toast.success(`${r.linhas} lançamentos gerados`);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao gerar");
    } finally {
      setOcupado(false);
    }
  }

  if (!temEmpresa) {
    return (
      <section className="card grid place-items-center gap-3 px-6 py-16 text-center">
        <span className="grid size-12 place-items-center rounded-2xl bg-ent/12 text-ent">
          <Building2 className="size-6" />
        </span>
        <p className="text-sm font-medium text-ink">Selecione uma empresa</p>
      </section>
    );
  }

  if (!casadas) {
    return (
      <section className="card grid place-items-center gap-3 px-6 py-16 text-center">
        <span className="grid size-12 place-items-center rounded-2xl bg-surface-2 text-muted">
          <FileUp className="size-6" />
        </span>
        <p className="text-sm font-medium text-ink">Nenhum balancete lido</p>
      </section>
    );
  }

  const podeGerar =
    !!casadas.length && !!data && contaImpl != null && !!historico && resumo.semConta === 0;

  return (
    <div className="grid gap-4">
      {/* Resumo do de-para */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Kpi rotulo="Contas" valor={resumo.total} cor="text-ink" />
            <Kpi rotulo="Casadas" valor={resumo.casadas} cor="text-good" />
            <Kpi rotulo="Confira" valor={resumo.duvidosas} cor="text-warn" />
            <Kpi rotulo="Sem conta" valor={resumo.semConta} cor="text-critical" />
          </div>

          {/* 3. Tabela do de-para */}
          <section className="card overflow-hidden">
            <div className="max-h-[26rem] overflow-auto">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-surface-2 text-muted">
                  <tr>
                    <th className="px-3 py-2 font-medium">Origem</th>
                    <th className="px-3 py-2 font-medium">Saldo</th>
                    <th className="px-3 py-2 font-medium">Conta no Questor</th>
                    <th className="px-3 py-2 font-medium">Situação</th>
                  </tr>
                </thead>
                <tbody>
                  {casadas.map((c, i) => {
                    const b = BADGE[c.status];
                    const Icone = b.icone;
                    const editar = editando === i || c.status !== "casada";
                    return (
                      <tr key={c.origem.chave + i} className="border-t border-hairline align-top">
                        <td className="px-3 py-2">
                          <div className="font-medium text-ink">{c.origem.descricao}</div>
                          <div className="text-[10px] text-muted">
                            {c.origem.chave}
                            {c.origem.classif ? ` · ${c.origem.classif}` : ""}
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-ink-2">
                          {brl(c.origem.saldo)}{" "}
                          <span className="text-[10px] text-muted">{c.natureza ?? "?"}</span>
                        </td>
                        <td className="px-3 py-2">
                          {editar ? (
                            <ContaDropdown
                              empresa={empresa}
                              valor={c.conta}
                              onMudar={(conta) => escolherConta(i, conta)}
                              limpavel
                              largura="w-80"
                            />
                          ) : (
                            <button
                              onClick={() => setEditando(i)}
                              className="flex items-center gap-1.5 text-left text-ink hover:text-ent"
                            >
                              <span>
                                <span className="font-mono">{c.conta}</span>{" "}
                                <span className="text-muted">{c.contaDescr}</span>
                              </span>
                              <Pencil className="size-3 shrink-0 opacity-50" />
                            </button>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          <span
                            className={clsx(
                              "inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium",
                              b.cor
                            )}
                          >
                            <Icone className="size-3" />
                            {b.rotulo}
                            {c.status === "duvidosa" && (
                              <span className="opacity-70">{Math.round(c.confianca * 100)}%</span>
                            )}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          {/* 4. Parâmetros do lote e geração */}
          <section className="card grid gap-4 p-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Campo rotulo="Filial (estab)">
                <input
                  value={estab}
                  onChange={(e) => setEstab(e.target.value.replace(/\D/g, ""))}
                  className="h-10 w-full rounded-lg border border-hairline bg-surface-2 px-3 text-sm text-ink"
                />
              </Campo>
              <Campo rotulo="Data dos lançamentos">
                <input
                  type="date"
                  value={data}
                  onChange={(e) => setData(e.target.value)}
                  className="h-10 w-full rounded-lg border border-hairline bg-surface-2 px-3 text-sm text-ink"
                />
              </Campo>
              <Campo rotulo="Histórico (código)">
                <input
                  value={historico}
                  onChange={(e) => setHistorico(e.target.value.replace(/\D/g, ""))}
                  placeholder="ex.: 1000"
                  className="h-10 w-full rounded-lg border border-hairline bg-surface-2 px-3 text-sm text-ink placeholder:text-muted"
                />
              </Campo>
              <Campo rotulo="Conta transitória (contrapartida)">
                <ContaDropdown
                  empresa={empresa}
                  valor={contaImpl}
                  onMudar={setContaImpl}
                  limpavel
                  largura="w-full"
                />
              </Campo>
            </div>
            <Campo rotulo="Complemento do histórico">
              <input
                value={complemento}
                onChange={(e) => setComplemento(e.target.value)}
                className="h-10 w-full rounded-lg border border-hairline bg-surface-2 px-3 text-sm text-ink"
              />
            </Campo>

            {resumo.semConta > 0 ? (
              <p className="text-xs text-critical">
                Resolva as {resumo.semConta} contas sem correspondência antes de gerar — senão o
                balancete não fecha.
              </p>
            ) : (
              <p className={clsx("text-xs", resumo.fecha ? "text-good" : "text-critical")}>
                {resumo.fecha
                  ? `Balancete fecha: débitos ${brl(resumo.deb)} = créditos ${brl(resumo.cred)}.`
                  : `Balancete NÃO fecha: débitos ${brl(resumo.deb)} × créditos ${brl(resumo.cred)} (diferença ${brl(Math.abs(resumo.deb - resumo.cred))}). A leitura do PDF pode ter vindo incompleta — confira as contas.`}
              </p>
            )}

            <div className="flex items-center gap-3">
              <button
                onClick={gerar}
                disabled={ocupado || !podeGerar}
                className="flex h-10 items-center gap-2 rounded-lg bg-ent px-4 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                <Download className="size-4" />
                Gerar arquivo do Questor
              </button>
              <button
                onClick={salvarPadrao}
                className="h-10 rounded-lg border border-hairline px-3 text-sm text-ink-2 hover:text-ink"
              >
                Salvar padrão desta empresa
              </button>
            </div>
          </section>
    </div>
  );
}

function Kpi({ rotulo, valor, cor }: { rotulo: string; valor: number; cor: string }) {
  return (
    <div className="card p-3">
      <p className="text-[10px] uppercase tracking-wide text-muted">{rotulo}</p>
      <p className={clsx("text-xl font-semibold", cor)}>{valor}</p>
    </div>
  );
}

function Campo({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-1.5">
      <span className="text-xs font-medium text-ink-2">{rotulo}</span>
      {children}
    </label>
  );
}
