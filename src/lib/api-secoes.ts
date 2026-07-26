import type { ModuloId } from "./modulos";

/**
 * Registro ÚNICO endpoint -> seção(ões) dona(s). É o que deixa o gate do
 * `apiRoute` ser fino por seção mesmo com as rotas namespaceadas só por módulo
 * (e algumas compartilhadas — `/api/fiscal/impostos` serve Painel e Tributos).
 *
 * Regra do gate: libera se ALGUMA seção dona satisfaz o nível pedido. Endpoint
 * não listado cai no gate de módulo (seguro: exige acesso a alguma seção do
 * módulo). Mantido à mão de propósito — a fronteira de permissão não deve
 * depender de heurística de nome.
 *
 * A chave é o PRIMEIRO segmento após `/api/<modulo>/` (ex.: `plano/replicar`
 * casa por `plano`).
 */
const MAPA: Record<ModuloId, Record<string, string[]>> = {
  fiscal: {
    // Painel
    overview: ["painel"],
    timeseries: ["painel"],
    especies: ["painel"],
    impostos: ["painel", "tributos"], // card reusado nas duas seções
    "impostos-serie": ["painel"],
    devolucoes: ["painel"],
    "devolucoes-resumo": ["painel"],
    "devolucoes-serie": ["painel"],
    "devolucoes-contrapartes": ["painel"],
    "cancelamentos-resumo": ["painel"],
    "cancelamentos-serie": ["painel"],
    "cancelamentos-ranking": ["painel"],
    // Análises
    "top-empresas": ["analises"],
    "top-pessoas": ["analises"],
    estados: ["analises"],
    produtos: ["analises"],
    cfops: ["analises"],
    municipios: ["analises"],
    frete: ["analises"],
    "faixas-valor": ["analises"],
    origem: ["analises"],
    // Tributos
    "tributos-difal": ["tributos"],
    "tributos-cst": ["tributos"],
    "tributos-carga-empresas": ["tributos"],
    "impostos-empresas": ["tributos"],
    // Produtividade
    produtividade: ["produtividade"],
    "produtividade-serie": ["produtividade"],
    "produtividade-calendario": ["produtividade"],
    // Conformidade
    conformidade: ["conformidade"],
    "conformidade-empresas": ["conformidade"],
    // Dados
    "notas-lista": ["dados"],
    "nota-itens": ["dados"],
    contrapartes: ["dados"],
  },
  contabil: {
    // Notas (explorador)
    "notas-lista": ["notas"],
    "nota-itens": ["notas"],
    contrapartes: ["notas"],
    // Conferência (+ aba Configuração do plano de contabilização)
    conferencia: ["conferencia"],
    "auditoria-duplicadas": ["conferencia"],
    plano: ["conferencia"],
    aprender: ["conferencia"],
    // Balancete
    "balancete-fiscal": ["balancete"],
    "balancete-fiscal-lancamentos": ["balancete"],
    "balancete-lancamentos": ["balancete"],
    "balancete-culpados": ["balancete"],
    "bf-check": ["balancete"],
    // Análise de Balancete (laudo por IA)
    "analise-balancete": ["analise"],
    // Conciliação (+ aba Regras)
    "extrato-importar": ["conciliacao"],
    "extrato-regras": ["conciliacao"],
    // Lookup de contas: usado na Configuração e na Conciliação
    contas: ["conferencia", "conciliacao"],
  },
  folha: {
    filtros: ["rotatividade"],
    funcionario: ["rotatividade"],
    movimentacoes: ["rotatividade"],
    pessoas: ["rotatividade"],
    turnover: ["rotatividade"],
  },
  rh: {
    // Diretório
    funcionarios: ["diretorio"],
    funcionario: ["diretorio", "rotatividade"], // ficha reusada no drill da rotatividade
    setores: ["diretorio", "gestores"], // lista de setores serve filtro e cadastro
    // Experiência
    experiencia: ["experiencia"],
    "experiencia-reenviar": ["experiencia"],
    // Gestores
    gestores: ["gestores"],
    // Rotatividade (reusa libs da Folha, rotas próprias do módulo)
    turnover: ["rotatividade"],
    filtros: ["rotatividade"],
    movimentacoes: ["rotatividade"],
    pessoas: ["rotatividade"],
    // /api/rh/cron/experiencia é público (segredo próprio) — NÃO passa por apiRoute.
  },
  patrimonio: {},
};

/**
 * Seções donas do endpoint, ou `undefined` se não mapeado (cai no gate de
 * módulo). `segmentos` é o resto do path após `/api/<modulo>/`.
 */
export function secoesDoEndpoint(modulo: ModuloId, segmentos: string): string[] | undefined {
  const primeiro = segmentos.split("/")[0];
  return MAPA[modulo]?.[primeiro];
}
