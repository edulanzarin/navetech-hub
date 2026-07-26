import { SECOES_FISCAL, type SecaoFiscal } from "./fiscal-secoes";
import { SECOES_CONTABIL } from "./contabil-secoes";
import { SECOES_FOLHA } from "./folha-secoes";
import { SECOES_RH } from "./rh-secoes";

export type ModuloId = "fiscal" | "contabil" | "folha" | "rh" | "patrimonio";

/**
 * Catálogo dos módulos do Nexo. É a fonte única: dirige o launcher, a
 * sidebar de cada módulo e o gate de permissão (o id casa com o nível do perfil
 * em [[sessao]] e com o prefixo /api/<id> das rotas). Módulo novo é uma entrada
 * aqui — não três lugares para editar e um para esquecer.
 */
export interface Modulo {
  id: ModuloId;
  titulo: string;
  descricao: string;
  /** Caminho do ícone do módulo em /public/images (ex.: "/images/fiscal.ico"). */
  icone: string;
  /** Falso enquanto o módulo ainda não existe — aparece como "em breve". */
  ativo: boolean;
  /** Primeira tela ao entrar no módulo pelo launcher. */
  home: string;
}

export const MODULOS: Modulo[] = [
  {
    id: "fiscal",
    titulo: "Fiscal",
    descricao: "Painéis, análises e tributos sobre as notas",
    icone: "/images/fiscal.ico",
    ativo: true,
    home: "/fiscal/painel",
  },
  {
    id: "contabil",
    titulo: "Contábil",
    descricao: "Conferência fiscal e conciliação bancária",
    icone: "/images/contabil.ico",
    ativo: true,
    home: "/contabil/conferencia",
  },
  {
    id: "folha",
    titulo: "Folha",
    descricao: "Rotatividade de pessoal (turnover)",
    icone: "/images/folha.ico",
    ativo: true,
    home: "/folha/rotatividade",
  },
  {
    id: "rh",
    titulo: "RH",
    descricao: "Pessoal da Navecon: diretório e experiência",
    icone: "/images/rh.ico",
    ativo: true,
    home: "/rh/diretorio",
  },
  {
    id: "patrimonio",
    titulo: "Patrimônio",
    descricao: "Em breve",
    icone: "/images/logo.png",
    ativo: false,
    home: "#",
  },
];

export function getModulo(id: string): Modulo | undefined {
  return MODULOS.find((m) => m.id === id);
}

const SECOES: Record<ModuloId, SecaoFiscal[]> = {
  fiscal: SECOES_FISCAL,
  contabil: SECOES_CONTABIL,
  folha: SECOES_FOLHA,
  rh: SECOES_RH,
  patrimonio: [],
};

/** Seções que a sidebar do módulo lista. A sidebar só usa o recorte SecaoFiscal. */
export function secoesDoModulo(id: ModuloId): SecaoFiscal[] {
  return SECOES[id];
}
