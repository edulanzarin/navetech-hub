import { Gauge, Plane, Repeat, ShieldCheck, Wallet } from "lucide-react";
import type { SecaoFiscal } from "./fiscal-secoes";

/**
 * Seções do módulo Folha. Mesmo recorte `SecaoFiscal` do Fiscal (uma seção =
 * um item de sidebar). Seção nova é uma entrada aqui.
 *
 * `metrica` (toggle Valor|Quantidade) não existe na Folha, mas o campo é do tipo
 * compartilhado — fica `false`.
 */
export const SECOES_FOLHA: SecaoFiscal[] = [
  {
    id: "rotatividade",
    icone: Repeat,
    rotulo: "Rotatividade",
    path: "/folha/rotatividade",
    metrica: false,
    descricao: "Turnover: admissões e desligamentos sobre o efetivo",
  },
  {
    id: "produtividade",
    icone: Gauge,
    rotulo: "Produtividade",
    path: "/folha/produtividade",
    metrica: false,
    descricao: "O que o DP fez no período, por colaborador",
  },
  // Seção nova entra por último (ver memória de ordem da sidebar).
  {
    id: "custo",
    icone: Wallet,
    rotulo: "Custo de Folha",
    path: "/folha/custo",
    metrica: false,
    descricao: "Quanto a folha custa: proventos por rubrica, tipo e setor",
  },
  {
    id: "esocial",
    icone: ShieldCheck,
    rotulo: "eSocial",
    path: "/folha/esocial",
    metrica: false,
    descricao: "Conformidade: eventos aceitos, pendentes e rejeitados",
  },
  {
    id: "ferias",
    icone: Plane,
    rotulo: "Férias",
    path: "/folha/ferias",
    metrica: false,
    descricao: "Férias vencidas e a vencer — risco de dobro",
  },
];

export function secaoFolhaAtual(pathname: string): SecaoFiscal | undefined {
  return SECOES_FOLHA.find((s) => pathname === s.path || pathname.startsWith(s.path + "/"));
}
