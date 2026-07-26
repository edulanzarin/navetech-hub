/**
 * DTOs do módulo RH — tipos puros compartilhados entre rotas (servidor) e
 * hooks/telas (client). Sem imports de servidor, para poder entrar no bundle.
 */
import type { Marco, StatusExperiencia } from "./rh-experiencia";

/** Linha do Diretório: funcionário ativo de uma das duas empresas. */
export interface FuncionarioDiretorio {
  codigoempresa: number;
  contrato: number;
  nome: string;
  cargo: string | null;
  setor: string | null;
  classiforgan: string | null;
  dataadm: string; // YYYY-MM-DD
}

/** Setor do organograma com funcionários ativos (filtro + cadastro de gestores). */
export interface SetorRh {
  codigoempresa: number;
  codigoestab: number;
  classiforgan: string;
  nome: string; // descrorgan
  ativos: number;
}

/** Gestor cadastrado num setor (recebe o formulário de experiência). */
export interface GestorRh {
  id: number;
  codigoempresa: number;
  codigoestab: number;
  classiforgan: string;
  nome: string;
  email: string;
  papel: "supervisor" | "coordenador" | "outro";
  ativo: boolean;
}

/** Item do painel de Experiência: um marco (45/90) de um contrato. */
export interface ExperienciaItem {
  id: number | null; // null = ainda não materializado (só projetado)
  codigoempresa: number;
  contrato: number;
  nome: string;
  cargo: string | null;
  setor: string | null;
  classiforgan: string | null;
  dataadm: string;
  marco: Marco;
  vencimento: string; // YYYY-MM-DD (dataadm + marco)
  status: StatusExperiencia;
  diasParaVencer: number; // negativo = venceu
  gestores: number; // quantos gestores cadastrados no setor
  ultimoLembrete: string | null; // ISO do último lembrete enviado
  resposta: {
    recomendacao: string;
    respondidoPor: string;
    respondidoEm: string;
    comentarios: string | null;
  } | null;
}
