import "server-only";
import { query } from "./db";
import {
  type Sessao,
  podeAcessarModuloSync,
  empresasPermitidas,
} from "./sessao";
import { EMPRESAS_RH } from "./rh";
import { montarPainelExperiencia } from "./rh-experiencia-dados";
import type { ModuloId } from "./modulos";

/**
 * Central de alertas: o "empurrão proativo" do Nexo. Em vez de o usuário abrir
 * cada tela pra descobrir pendência, os alertas vêm até ele — respeitando SEMPRE
 * a permissão de módulo e o escopo de empresa da sessão (um alerta nunca revela
 * dado de empresa fora do alcance).
 *
 * Só entram categorias BARATAS de computar a cada carga (uma query cada):
 *  - Experiências vencendo/atrasadas (RH).
 *  - Conformidade fiscal do mês: notas canceladas/denegadas/sem chave (Fiscal).
 * O saldo atípico do balancete NÃO entra aqui porque exigiria varrer o razão de
 * todas as empresas a cada carga; ele é sinalizado na própria tela do balancete.
 */

export type Severidade = "alta" | "media" | "baixa";

export interface Alerta {
  id: string;
  modulo: ModuloId;
  severidade: Severidade;
  titulo: string;
  detalhe: string;
  href: string;
  contagem: number;
}

/** Primeiro e último dia do mês corrente, em ISO "YYYY-MM-DD". */
function mesCorrente(): { inicio: string; fim: string } {
  const hoje = new Date();
  const ano = hoje.getUTCFullYear();
  const mes = hoje.getUTCMonth(); // 0-based
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  return {
    inicio: iso(new Date(Date.UTC(ano, mes, 1))),
    fim: iso(new Date(Date.UTC(ano, mes + 1, 0))),
  };
}

/** Alerta de experiências (RH): atrasadas sem resposta + vencendo em ≤15 dias. */
async function alertaExperiencias(): Promise<Alerta | null> {
  const itens = await montarPainelExperiencia([...EMPRESAS_RH]);
  const abertas = itens.filter((i) => i.status !== "respondido");
  const atrasadas = abertas.filter((i) => i.status === "atraso").length;
  const vencendo = abertas.filter((i) => i.status !== "atraso" && i.diasParaVencer <= 15).length;
  const total = atrasadas + vencendo;
  if (total === 0) return null;

  const partes: string[] = [];
  if (atrasadas) partes.push(`${atrasadas} vencida${atrasadas > 1 ? "s" : ""} sem resposta`);
  if (vencendo) partes.push(`${vencendo} vencendo em até 15 dias`);
  return {
    id: "experiencias",
    modulo: "rh",
    severidade: atrasadas > 0 ? "alta" : "media",
    titulo: "Avaliações de experiência pendentes",
    detalhe: partes.join(" · "),
    href: "/rh/experiencia",
    contagem: total,
  };
}

interface ConfRow {
  canceladas: number;
  denegadas: number;
  sem_chave: number;
  empresas_afetadas: number;
}

/** Alerta de conformidade fiscal do mês: notas canceladas/denegadas/sem chave. */
async function alertaConformidade(escopo: number[] | "todas"): Promise<Alerta | null> {
  const { inicio, fim } = mesCorrente();
  const cond = ["f.datalctofis between $1 and $2"];
  const params: unknown[] = [inicio, fim];
  if (escopo !== "todas") {
    // Escopo vazio já foi tratado pelo chamador; aqui há ao menos uma empresa.
    params.push(escopo);
    cond.push(`f.codigoempresa = any($${params.length}::int[])`);
  }
  const [r] = await query<ConfRow>(
    `select count(*) filter (where f.cancelada = '1')::int as canceladas,
            count(*) filter (where f.cdsituacao <> 0 and f.cancelada <> '1')::int as denegadas,
            count(*) filter (where f.cdmodelo in ('55','65','57')
                               and (f.chavenfesai is null or length(btrim(f.chavenfesai)) <> 44))::int as sem_chave,
            count(distinct f.codigoempresa) filter (
              where f.cancelada = '1' or f.cdsituacao <> 0
                 or (f.cdmodelo in ('55','65','57')
                     and (f.chavenfesai is null or length(btrim(f.chavenfesai)) <> 44))
            )::int as empresas_afetadas
       from lctofissai f
      where ${cond.join(" and ")}`,
    params
  );
  const total = (r?.canceladas ?? 0) + (r?.denegadas ?? 0) + (r?.sem_chave ?? 0);
  if (total === 0) return null;

  const partes: string[] = [];
  if (r.canceladas) partes.push(`${r.canceladas} cancelada${r.canceladas > 1 ? "s" : ""}`);
  if (r.denegadas) partes.push(`${r.denegadas} denegada${r.denegadas > 1 ? "s" : ""}`);
  if (r.sem_chave) partes.push(`${r.sem_chave} sem chave`);
  return {
    id: "conformidade",
    modulo: "fiscal",
    severidade: r.denegadas > 0 || r.sem_chave > 0 ? "alta" : "media",
    titulo: "Conformidade fiscal do mês",
    detalhe: `${partes.join(" · ")} em ${r.empresas_afetadas} empresa${r.empresas_afetadas > 1 ? "s" : ""}`,
    href: "/fiscal/conformidade",
    contagem: total,
  };
}

const ORDEM: Record<Severidade, number> = { alta: 0, media: 1, baixa: 2 };

/**
 * Coleta os alertas que a sessão PODE ver. Cada categoria roda só se o usuário
 * acessa o módulo; a fiscal ainda respeita o escopo de empresa (lista vazia =
 * sem alerta). Falha de uma categoria não derruba as outras.
 */
export async function coletarAlertas(sessao: Sessao): Promise<Alerta[]> {
  const tarefas: Promise<Alerta | null>[] = [];

  if (podeAcessarModuloSync(sessao, "rh")) {
    tarefas.push(alertaExperiencias());
  }
  if (podeAcessarModuloSync(sessao, "fiscal")) {
    const escopo = empresasPermitidas(sessao);
    if (escopo === "todas" || escopo.length > 0) {
      tarefas.push(alertaConformidade(escopo));
    }
  }

  const resultados = await Promise.allSettled(tarefas);
  const alertas: Alerta[] = [];
  for (const r of resultados) {
    if (r.status === "fulfilled" && r.value) alertas.push(r.value);
    else if (r.status === "rejected") console.error("[alertas]", r.reason);
  }
  return alertas.sort((a, b) => ORDEM[a.severidade] - ORDEM[b.severidade]);
}
