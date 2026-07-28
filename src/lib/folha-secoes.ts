import { Gauge, Repeat } from "lucide-react";
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
];

export function secaoFolhaAtual(pathname: string): SecaoFiscal | undefined {
  return SECOES_FOLHA.find((s) => pathname === s.path || pathname.startsWith(s.path + "/"));
}
