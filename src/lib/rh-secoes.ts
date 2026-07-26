import { CalendarClock, Repeat, UserCog, Users } from "lucide-react";
import type { SecaoFiscal } from "./fiscal-secoes";

/**
 * Seções do módulo RH (interno da Navecon — só NAVECON e FOUR). Mesmo recorte
 * `SecaoFiscal` dos outros módulos (uma seção = um item de sidebar). O toggle
 * Valor|Quantidade não existe aqui, então `metrica` fica `false`.
 *
 * Gestores é a seção de cadastro (quem recebe o formulário de experiência);
 * fica por último, como configuração.
 */
export const SECOES_RH: SecaoFiscal[] = [
  {
    id: "diretorio",
    icone: Users,
    rotulo: "Diretório",
    path: "/rh/diretorio",
    metrica: false,
    descricao: "Funcionários das duas empresas, com filtro e ficha",
  },
  {
    id: "experiencia",
    icone: CalendarClock,
    rotulo: "Experiência",
    path: "/rh/experiencia",
    metrica: false,
    descricao: "Contratos em experiência: avaliação de 45 e 90 dias",
  },
  {
    id: "rotatividade",
    icone: Repeat,
    rotulo: "Rotatividade",
    path: "/rh/rotatividade",
    metrica: false,
    descricao: "Turnover das duas empresas",
  },
  {
    id: "gestores",
    icone: UserCog,
    rotulo: "Gestores",
    path: "/rh/gestores",
    metrica: false,
    descricao: "Supervisores e coordenadores por setor",
  },
];

export function secaoRhAtual(pathname: string): SecaoFiscal | undefined {
  return SECOES_RH.find((s) => pathname === s.path || pathname.startsWith(s.path + "/"));
}
