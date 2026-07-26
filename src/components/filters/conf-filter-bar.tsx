"use client";

import { useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Building2, CalendarRange, Check, Search } from "lucide-react";
import { toast } from "sonner";
import { Dropdown, ItemLista } from "@/components/ui/dropdown";
import { FilialDropdown } from "@/components/filters/filial-dropdown";
import { BotaoExecutar } from "@/components/filters/botao-executar";
import { useEmpresas } from "@/hooks/use-api";
import { useFiltros, useRascunhoFiltros } from "@/hooks/use-filters";
import { dataBR, hojeISO, inicioDoMesISO } from "@/lib/format";

function presets() {
  const hoje = new Date();
  const iso = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const mesPassadoIni = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
  const mesPassadoFim = new Date(hoje.getFullYear(), hoje.getMonth(), 0);
  return [
    { nome: "Este mês", inicio: inicioDoMesISO(), fim: hojeISO() },
    { nome: "Mês passado", inicio: iso(mesPassadoIni), fim: iso(mesPassadoFim) },
    { nome: "Este ano", inicio: `${hoje.getFullYear()}-01-01`, fim: hojeISO() },
    {
      nome: "Ano anterior",
      inicio: `${hoje.getFullYear() - 1}-01-01`,
      fim: `${hoje.getFullYear() - 1}-12-31`,
    },
  ];
}

/**
 * `mostrarPeriodo=false` na aba Configuração: o plano de contabilização é
 * configuração fixa da empresa, não tem recorte de tempo.
 *
 * `execucao` vem do catálogo da aba ([[executar-com-botao]]): com botão, o
 * usuário edita o rascunho sem disparar nada e só o botão (com o verbo da
 * tela — "Executar", "Carregar") aplica; `imediata` é para telas cujo gatilho
 * pesado é próprio (o envio do extrato na Conciliação) — a empresa aplica na
 * hora, porque ela é contexto, não consulta.
 */
export function ConfFilterBar({
  mostrarPeriodo = true,
  mostrarFilial = true,
  execucao = { imediata: false, rotulo: "Executar" },
  extras,
}: {
  mostrarPeriodo?: boolean;
  /** Seletor de filial (só telas de dado; a Folha tem o seu próprio, e o
   *  cadastro do plano é por empresa). Depende do buildWhere honrar `estabs`. */
  mostrarFilial?: boolean;
  execucao?: { imediata: boolean; rotulo: string };
  /** Controles que a aba põe NA LINHA da barra, ao lado da empresa (ex.: conta
   *  e extrato na Conciliação). Compartilham estado com a página via seção. */
  extras?: React.ReactNode;
} = {}) {
  const { filtros, atualizar } = useFiltros();
  const { rascunho: rascunhoState, editar: editarRascunho, dirty, executar } =
    useRascunhoFiltros();
  const queryClient = useQueryClient();
  // Executar sempre roda — mesmo sem mudar filtro. `executar` comita o rascunho
  // (só refaz a consulta se algo mudou); a invalidação força o refetch quando
  // nada mudou, pra o clique ter efeito. Empresas/contas (cadastro) ficam de fora.
  const aoExecutar = () => {
    executar();
    queryClient.invalidateQueries({
      predicate: (q) => q.queryKey[0] !== "empresas" && q.queryKey[0] !== "contas",
    });
  };
  // No modo imediato a fonte é o aplicado e editar já comita.
  const rascunho = execucao.imediata ? filtros : rascunhoState;
  const editar = execucao.imediata ? atualizar : editarRascunho;
  const { data: empresas } = useEmpresas();
  const [busca, setBusca] = useState("");
  const iniRef = useRef<HTMLInputElement>(null);
  const fimRef = useRef<HTMLInputElement>(null);

  const listaPresets = useMemo(() => presets(), []);
  const presetAtivo = listaPresets.find(
    (p) => p.inicio === rascunho.inicio && p.fim === rascunho.fim
  );

  const empresaSel = rascunho.empresas[0];
  const rotuloEmpresa =
    empresaSel != null
      ? (empresas?.find((e) => e.codigo === empresaSel)?.nome ?? `Empresa ${empresaSel}`)
      : "Selecione a empresa";

  const empresasFiltradas = useMemo(() => {
    if (!empresas) return [];
    const q = busca.trim().toLowerCase();
    if (!q) return empresas;
    return empresas.filter(
      (e) => e.nome.toLowerCase().includes(q) || String(e.codigo).includes(q)
    );
  }, [empresas, busca]);

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Empresa (única, obrigatória) */}
      <Dropdown
        icone={<Building2 className="size-4" />}
        rotulo={rotuloEmpresa}
        ativo={empresaSel != null}
        largura="w-80"
      >
        {(fechar) => (
          <div>
            <div className="flex items-center gap-2 border-b border-hairline px-3 py-2">
              <Search className="size-4 text-muted" />
              <input
                autoFocus
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar por nome ou código…"
                className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-muted"
              />
            </div>
            <div className="max-h-72 overflow-y-auto py-1">
              {!empresas && <p className="px-3 py-2 text-sm text-muted">Carregando…</p>}
              {empresasFiltradas.slice(0, 200).map((e) => (
                <ItemLista
                  key={e.codigo}
                  selecionado={e.codigo === empresaSel}
                  onClick={() => {
                    // Troca de empresa zera as filiais (são de outra empresa).
                    editar({ empresas: [e.codigo], estabs: [] });
                    fechar();
                  }}
                >
                  <span className="grid size-4 shrink-0 place-items-center">
                    {e.codigo === empresaSel && <Check className="size-4 stroke-[3] text-ent" />}
                  </span>
                  <span className="flex-1 truncate">{e.nome}</span>
                  <span className="tnum text-xs text-muted">{e.codigo}</span>
                </ItemLista>
              ))}
              {empresasFiltradas.length > 200 && (
                <p className="px-3 py-2 text-xs text-muted">
                  Mostrando 200 de {empresasFiltradas.length} — refine a busca
                </p>
              )}
            </div>
          </div>
        )}
      </Dropdown>

      {/* Filial (só quando a empresa tem mais de uma) */}
      {mostrarFilial && (
        <FilialDropdown
          empresa={empresaSel ?? null}
          estabs={rascunho.estabs}
          onChange={(estabs) => editar({ estabs })}
        />
      )}

      {/* Período (teto de 1 ano) */}
      {mostrarPeriodo && (
        <Dropdown
          icone={<CalendarRange className="size-4" />}
          rotulo={
            presetAtivo ? presetAtivo.nome : `${dataBR(rascunho.inicio)} – ${dataBR(rascunho.fim)}`
          }
          ativo
          largura="w-64"
        >
          {(fechar) => (
            <div>
              <div className="py-1">
                {listaPresets.map((p) => (
                  <ItemLista
                    key={p.nome}
                    selecionado={presetAtivo?.nome === p.nome}
                    onClick={() => {
                      editar({ inicio: p.inicio, fim: p.fim });
                      fechar();
                    }}
                  >
                    <span className="grid size-4 place-items-center">
                      {presetAtivo?.nome === p.nome && (
                        <Check className="size-4 stroke-[3] text-ent" />
                      )}
                    </span>
                    {p.nome}
                  </ItemLista>
                ))}
              </div>
              <div className="border-t border-hairline p-3">
                <p className="mb-2 text-xs text-muted">Período personalizado (máx. 1 ano)</p>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-xs text-muted">
                    <span className="w-8 shrink-0">De</span>
                    <input
                      key={`ini-${rascunho.inicio}`}
                      ref={iniRef}
                      type="date"
                      defaultValue={rascunho.inicio}
                      className="h-8 w-full rounded-md border border-hairline bg-surface-2 px-2 text-xs text-ink"
                    />
                  </label>
                  <label className="flex items-center gap-2 text-xs text-muted">
                    <span className="w-8 shrink-0">Até</span>
                    <input
                      key={`fim-${rascunho.fim}`}
                      ref={fimRef}
                      type="date"
                      defaultValue={rascunho.fim}
                      className="h-8 w-full rounded-md border border-hairline bg-surface-2 px-2 text-xs text-ink"
                    />
                  </label>
                  <button
                    onClick={() => {
                      const v1 = iniRef.current?.value;
                      const v2 = fimRef.current?.value;
                      if (!v1 || !v2 || v1 < "2000-01-01" || v2 < "2000-01-01") return;
                      const [ini, fimOrig] = v1 <= v2 ? [v1, v2] : [v2, v1];
                      let fim = fimOrig;
                      const MAX = 365 * 86_400_000;
                      if (Date.parse(fim) - Date.parse(ini) > MAX) {
                        const d = new Date(ini + "T00:00:00Z");
                        d.setUTCDate(d.getUTCDate() + 365);
                        fim = d.toISOString().slice(0, 10);
                        toast.info("Período limitado a 1 ano");
                      }
                      editar({ inicio: ini, fim });
                      fechar();
                    }}
                    className="h-8 w-full rounded-md bg-ent text-xs font-medium text-white transition-opacity hover:opacity-90"
                  >
                    Definir período
                  </button>
                </div>
              </div>
            </div>
          )}
        </Dropdown>
      )}

      {extras}

      {!execucao.imediata && (
        // Fixo na direita: não anda conforme a largura dos inputs.
        <div className="ml-auto">
          <BotaoExecutar
            onClick={aoExecutar}
            dirty={dirty}
            rotulo={execucao.rotulo}
            disabled={empresaSel == null}
            title={empresaSel == null ? "Selecione uma empresa" : undefined}
          />
        </div>
      )}
    </div>
  );
}
