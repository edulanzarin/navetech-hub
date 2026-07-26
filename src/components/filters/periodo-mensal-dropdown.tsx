"use client";

import { useRef } from "react";
import { CalendarRange, Check } from "lucide-react";
import { toast } from "sonner";
import { Dropdown, ItemLista } from "@/components/ui/dropdown";
import { mesBR } from "@/lib/format";

export interface PresetMes {
  nome: string;
  /** Mês inicial "YYYY-MM". */
  mesIni: string;
  /** Mês final "YYYY-MM" (inclusive). */
  mesFim: string;
}

/** Último dia do mês "YYYY-MM" como ISO "YYYY-MM-DD". */
function fimDoMes(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  const ultimo = new Date(y, m, 0).getDate();
  return `${ym}-${String(ultimo).padStart(2, "0")}`;
}

/** Nº de meses entre dois "YYYY-MM" (inclusive). */
function qtdMeses(mesIni: string, mesFim: string): number {
  const [ai, mi] = mesIni.split("-").map(Number);
  const [af, mf] = mesFim.split("-").map(Number);
  return (af - ai) * 12 + (mf - mi) + 1;
}

/** Presets mensais para análise de balancete (todos ≤ 12 meses). */
export function presetsMensais(): PresetMes[] {
  const hoje = new Date();
  const ym = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  const mesAtras = (n: number) => ym(new Date(hoje.getFullYear(), hoje.getMonth() - n, 1));
  return [
    { nome: "Últimos 12 meses", mesIni: mesAtras(11), mesFim: ym(hoje) },
    { nome: "Últimos 6 meses", mesIni: mesAtras(5), mesFim: ym(hoje) },
    { nome: "Este ano", mesIni: `${hoje.getFullYear()}-01`, mesFim: ym(hoje) },
    {
      nome: "Ano anterior",
      mesIni: `${hoje.getFullYear() - 1}-01`,
      mesFim: `${hoje.getFullYear() - 1}-12`,
    },
  ];
}

/**
 * Seletor de período MENSAL — mesmo estilo do `PeriodoDropdown`, mas a escolha é
 * por mês (o balancete é mensal). Internamente continua entregando `inicio`/`fim`
 * como datas ISO (1º dia do mês inicial → último dia do mês final), para não
 * mexer no resto do funil de filtros. Teto de 12 meses.
 */
export function PeriodoMensalDropdown({
  inicio,
  fim,
  onChange,
}: {
  inicio: string;
  fim: string;
  onChange: (inicio: string, fim: string) => void;
}) {
  const lista = presetsMensais();
  const iniRef = useRef<HTMLInputElement>(null);
  const fimRef = useRef<HTMLInputElement>(null);

  const mesIniAtual = inicio.slice(0, 7);
  const mesFimAtual = fim.slice(0, 7);
  const presetAtivo = lista.find(
    (p) => p.mesIni === mesIniAtual && fimDoMes(p.mesFim) === fim
  );

  const aplicarMeses = (mesIni: string, mesFim: string) => {
    onChange(`${mesIni}-01`, fimDoMes(mesFim));
  };

  return (
    <Dropdown
      icone={<CalendarRange className="size-4" />}
      rotulo={
        presetAtivo
          ? presetAtivo.nome
          : mesIniAtual === mesFimAtual
            ? mesBR(inicio)
            : `${mesBR(inicio)} – ${mesBR(fim)}`
      }
      ativo
      largura="w-64"
    >
      {(fechar) => (
        <div>
          <div className="py-1">
            {lista.map((p) => (
              <ItemLista
                key={p.nome}
                selecionado={presetAtivo?.nome === p.nome}
                onClick={() => {
                  aplicarMeses(p.mesIni, p.mesFim);
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
            <p className="mb-2 text-xs text-muted">Intervalo de meses (máx. 12)</p>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-xs text-muted">
                <span className="w-8 shrink-0">De</span>
                <input
                  key={`ini-${mesIniAtual}`}
                  ref={iniRef}
                  type="month"
                  defaultValue={mesIniAtual}
                  className="h-8 w-full rounded-md border border-hairline bg-surface-2 px-2 text-xs text-ink"
                />
              </label>
              <label className="flex items-center gap-2 text-xs text-muted">
                <span className="w-8 shrink-0">Até</span>
                <input
                  key={`fim-${mesFimAtual}`}
                  ref={fimRef}
                  type="month"
                  defaultValue={mesFimAtual}
                  className="h-8 w-full rounded-md border border-hairline bg-surface-2 px-2 text-xs text-ink"
                />
              </label>
              <button
                onClick={() => {
                  const v1 = iniRef.current?.value;
                  const v2 = fimRef.current?.value;
                  if (!v1 || !v2 || v1 < "2000-01" || v2 < "2000-01") return;
                  const mi = v1 <= v2 ? v1 : v2;
                  let mf = v1 <= v2 ? v2 : v1;
                  // Teto de 12 meses: recua o fim para não passar do limite.
                  if (qtdMeses(mi, mf) > 12) {
                    const [y, m] = mi.split("-").map(Number);
                    const d = new Date(y, m - 1 + 11, 1);
                    mf = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
                    toast.info("Período limitado a 12 meses");
                  }
                  aplicarMeses(mi, mf);
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
  );
}
