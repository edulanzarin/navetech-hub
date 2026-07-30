export interface Empresa {
  codigo: number;
  nome: string;
}

/** Filial (estabelecimento) de uma empresa. */
export interface Filial {
  codigoestab: number;
  nome: string;
}

/** Grupo de empresas criado pelo usuário, salvo no navegador. */
export interface GrupoLocal {
  id: string;
  nome: string;
  empresas: number[];
}

export type Metrica = "valor" | "qtd";

export interface LadoResumo {
  valor: number;
  qtd: number;
  canceladas: number;
  valorAnterior: number;
  qtdAnterior: number;
}

export interface Overview {
  entradas: LadoResumo;
  saidas: LadoResumo;
  empresasAtivas: number;
  empresasAtivasAnterior: number;
}

export interface PontoSerie {
  bucket: string;
  entradas: number;
  saidas: number;
  qtdEntradas: number;
  qtdSaidas: number;
}

export interface Timeseries {
  granularidade: "dia" | "mes";
  pontos: PontoSerie[];
}

export interface EspecieResumo {
  especie: string;
  entradas: number;
  saidas: number;
  qtd: number;
}

export interface TopItem {
  codigo: number;
  nome: string;
  valor: number;
  qtd: number;
  /** Linha extra no tooltip (empresa do produto, descrição do CFOP…) */
  detalhe?: string | null;
}

export interface EstadoResumo {
  uf: string;
  nome: string | null;
  valor: number;
  qtd: number;
}

export interface ProdutoTop {
  codigoEmpresa: number;
  codigoProduto: number;
  descricao: string | null;
  unidade: string | null;
  nomeEmpresa: string | null;
  valor: number;
  qtd: number;
}

export interface CfopResumo {
  cfop: number;
  descricao: string | null;
  valor: number;
  itens: number;
}

export interface Impostos {
  // Impostos destacados nos itens
  icms: number;
  ipi: number;
  st: number;
  iss: number;
  // PIS/COFINS (tabela própria)
  pis: number;
  cofins: number;
  // Retenções (notas de serviço)
  irrf: number;
  inss: number;
  csll: number;
  issqn: number;
  // Interestadual / rural (só saídas)
  difal: number;
  fcp: number;
  funrural: number;
  // Base
  totalItens: number;
}

export interface PontoImposto {
  bucket: string;
  icms: number;
  st: number;
  ipi: number;
  iss: number;
  pis: number;
  cofins: number;
}

export interface ImpostosSerie {
  granularidade: "dia" | "mes";
  pontos: PontoImposto[];
}

export interface LadoQtdValor {
  valor: number;
  qtd: number;
}

export interface DevolucoesResumo {
  /** Devolução de venda — entra como nota de entrada. */
  ent: LadoQtdValor;
  /** Devolução de compra — sai como nota de saída. */
  sai: LadoQtdValor;
  faturamentoEnt: number;
  faturamentoSai: number;
}

export interface CancelamentosResumo {
  ent: { canceladas: number; total: number };
  sai: { canceladas: number; total: number };
}

export interface PontoValorSerie {
  granularidade: "dia" | "mes";
  pontos: { bucket: string; valor: number }[];
}

/** Contraparte no filtro de busca (server-side) do explorador. */
export interface ContraparteBusca {
  codigo: number;
  nome: string;
  doc: string | null;
  uf: string | null;
  qtd: number;
}

export interface ContrapartesResp {
  rows: ContraparteBusca[];
  page: number;
  temMais: boolean;
}

/** Uma nota fiscal na listagem bruta (explorador de dados). */
export interface NotaLista {
  empresa: number;
  empresaNome: string | null;
  chave: string;
  numero: number;
  serie: string | null;
  especie: string;
  modelo: string | null;
  data: string;
  contraparte: string | null;
  contraparteDoc: string | null;
  uf: string | null;
  valor: number;
  cancelada: boolean;
  chaveNfe: string | null;
}

export interface NotasListaResp {
  rows: NotaLista[];
  total: number;
  page: number;
  pageSize: number;
}

/** Produtividade: um colaborador (usuário do Questor) e o que ele lançou no período. */
export interface ColaboradorProd {
  codigo: number;
  nome: string;
  /** codigousuario 0 = ADMINISTRADOR/sistema (importações automáticas). */
  auto: boolean;
  /** Usuário com data de baixa (desligado/inativo no Questor). */
  inativo: boolean;
  notasEnt: number;
  notasSai: number;
  notas: number;
  valorEnt: number;
  valorSai: number;
  valor: number;
  /** Notas canceladas lançadas por ele (indicador de qualidade). */
  canceladas: number;
  /** Empresas distintas atendidas. */
  empresas: number;
}

export interface ProdutividadeSerie {
  granularidade: "dia" | "mes";
  pontos: { bucket: string; ent: number; sai: number }[];
}

/**
 * Calendário de atividade (estilo GitHub): notas lançadas por dia no período.
 * Sempre diário — o filtro é limitado a no máximo 1 ano, então a grade nunca
 * explode. Cobre exatamente o período selecionado (`inicio`..`fim`).
 */
export interface ProdutividadeCalendario {
  inicio: string;
  fim: string;
  /** d = 'YYYY-MM-DD'; n = notas lançadas nesse dia. */
  celulas: { d: string; n: number }[];
  total: number;
  pico: { d: string; n: number } | null;
}

/** Conformidade fiscal (saídas): pendências que valem atenção/correção. */
export interface ConformidadeResumo {
  totalNotas: number;
  totalItens: number;
  canceladas: number;
  /** cdsituacao especial (denegada / inutilizada / outras ≠ normal e ≠ cancelada). */
  denegadas: number;
  /** Modelos 55/65/57 sem chave de acesso de 44 dígitos. */
  semChave: number;
  ncmInvalidoItens: number;
  ncmInvalidoProdutos: number;
  situacoes: { codigo: number; nome: string; qtd: number }[];
}

export interface ConformidadeEmpresa {
  codigo: number;
  nome: string | null;
  ncmInvalido: number;
  canceladas: number;
  denegadas: number;
  semChave: number;
  pendencias: number;
}

/**
 * Situação de uma nota na conferência.
 * - `ok`: contabilizada e de acordo com o plano
 * - `divergente`: contabilizada, mas fora do plano
 * - `consolidada`: sem lançamento individual, mas contabilizada em bloco
 *   (varejo/cupom → consolidação mensal, origem MOV). Não é pendente.
 * - `pendente`: deveria ter lançamento e não tem
 * - `nao_exige`: CFOP que não gera lançamento (remessa, retorno…)
 * - `cancelada`: fora da conferência
 */
export type SituacaoNota =
  | "ok"
  | "divergente"
  | "duplicada"
  | "consolidada"
  | "pendente"
  | "nao_exige"
  | "cancelada";

/** Um lançamento de consolidação (origem MOV) — a prova de que a nota entrou no bloco. */
export interface ConsolidacaoLancamento {
  data: string;
  /** chaveorigem do lançamento, ex.: "MOVMS202605000001". */
  origem: string;
  contaDeb: number | null;
  contaCred: number | null;
  valor: number;
}

/**
 * Nota sem lançamento individual (ME/MS), mas cujas contas principais (o valor
 * contábil pelo plano) são cobertas por uma consolidação (origem MOV) no período
 * — varejo/cupom lançado em bloco. Não é pendência. Guarda as contas cobertas e
 * os próprios lançamentos MOV que as cobrem, para o detalhe mostrar a prova em
 * vez de só afirmar.
 */
export interface ConsolidacaoInfo {
  /** Contas principais da nota (receita/contrapartida) cobertas pela consolidação. */
  contas: { conta: number; descr: string | null }[];
  /** Lançamentos MOV do período que tocam essas contas (limitado; ver `qtd`). */
  lancamentos: ConsolidacaoLancamento[];
  /** Total de lançamentos de consolidação que cobrem as contas (pode passar do que vem em `lancamentos`). */
  qtd: number;
}

/**
 * Nota contabilizada mais de uma vez: a MESMA partida (débito, crédito, valor)
 * reaparece em dias distintos de lançamento — re-rodaram a contabilização.
 */
export interface Duplicidade {
  /** Quantas vezes a nota foi contabilizada (>= 2). */
  vezes: number;
  /** Valor lançado a mais (valor da nota × (vezes − 1)). */
  valor: number;
  /** Dias de lançamento envolvidos (YYYY-MM-DD), em ordem. */
  datas: string[];
}

export interface NotaConferida {
  chave: string;
  numero: number;
  serie: string | null;
  especie: string;
  data: string;
  valor: number;
  contraparte: string | null;
  doc: string | null;
  uf: string | null;
  cfops: number[];
  situacao: SituacaoNota;
  /** Quantos lançamentos contábeis a nota gerou. */
  lancamentos: number;
  divergencias: Divergencia[];
  /** Presente só quando a nota foi contabilizada em duplicidade. */
  duplicidade: Duplicidade | null;
  /** Presente só quando a nota foi contabilizada em bloco (consolidação MOV). */
  consolidacao: ConsolidacaoInfo | null;
}

export interface ConfResumo {
  total: number;
  contabilizadas: number;
  conformes: number;
  divergentes: number;
  /** Contabilizadas mais de uma vez (partida idêntica em dias distintos). */
  duplicadas: number;
  /** Sem lançamento individual, mas cobertas por consolidação (MOV) — em bloco. */
  consolidadas: number;
  pendentes: number;
  naoExigem: number;
  canceladas: number;
  /** Contabilizadas cujo CFOP não tem plano — não dá para conferir a conta. */
  semPlano: number;
  valorTotal: number;
  valorPendente: number;
  valorDivergente: number;
  /** Total lançado a mais pelas duplicadas. */
  valorDuplicado: number;
  /** Valor das notas contabilizadas em bloco (consolidação). */
  valorConsolidado: number;
}

/** Valor disponível para filtrar, com quantas notas ele tem. */
export interface Faceta {
  valor: string;
  rotulo: string | null;
  qtd: number;
}

export interface ConferenciaResp {
  resumo: ConfResumo;
  /** Página atual, já filtrada e ordenada. */
  notas: NotaConferida[];
  /** Quantas notas passam no filtro. */
  total: number;
  pagina: number;
  porPagina: number;
  /** Período grande demais: nem todas as notas foram analisadas. */
  truncado: boolean;
  /** Espécies e CFOPs realmente presentes, para montar os filtros. */
  facetas: { especies: Faceta[]; cfops: Faceta[] };
}

/** Conta analítica do plano de contas da empresa (vem do Questor). */
export interface ContaPlano {
  conta: number;
  descricao: string;
  classificacao: string | null;
}

/** Conta de banco da empresa, com as regras de contrapartida do extrato. */
export interface ContaBanco {
  id: number;
  empresa: number;
  conta: number;
  apelido: string | null;
  descricao: string | null;
  classificacao: string | null;
  regras: RegraExtratoDTO[];
}

export interface RegraExtratoDTO {
  id: number;
  termo: string;
  termoOriginal: string;
  tipo: "exato" | "parcial";
  contaPagamento: number | null;
  contaRecebimento: number | null;
  descrPagamento: string | null;
  descrRecebimento: string | null;
  historico: string | null;
  ativo: boolean;
}

/** Um lançamento contábil que a nota deveria gerar, segundo o plano. */
export interface LinhaPlano {
  seq: number;
  /** 1 = débito, -1 = crédito. */
  natureza: 1 | -1;
  conta: number | null;
  /** Conta que só se conhece no lançamento (fornecedor/cliente) — não dá para fixar. */
  contaVariavel: boolean;
  origemConta: number;
  descrConta: string | null;
  /** Fórmula do Questor, ex.: "vlrContabil-vlrIPI-vlrICMS". */
  regraValor: string | null;
}

/** Slot de contabilização do CFOP: o valor contábil ou um tributo. */
export interface ComponentePlano {
  id: string;
  rotulo: string;
  retido: boolean;
  tabela: number | null;
  descrTabela: string | null;
  linhas: LinhaPlano[];
}

/** Plano de contabilização de um CFOP — do Questor ou sobrescrito pelo usuário. */
export interface PlanoCfop {
  estab: number;
  cfop: number;
  cfopBase: number;
  descricao: string | null;
  lado: "ent" | "sai";
  contaLivro: number | null;
  componentes: ComponentePlano[];
  origem: "questor" | "override";
  contabiliza: boolean;
  observacao?: string | null;
  /** Quantas notas usaram esse CFOP no período consultado. */
  usos?: number;
  /**
   * O que o histórico (12 meses) diz sobre esse CFOP contabilizar. É a fonte do
   * `contabiliza` quando não há override — presente para a tela explicar o
   * porquê ("lançou em 157 de 162 notas"). Ausente = ainda não aprendido.
   */
  aprendido?: { contabiliza: boolean; notas: number; contabilizadas: number } | null;
}

// ── Balancete de verificação CONTÁBIL (o real, montado dos saldos) ───────────

/**
 * Uma linha do balancete de verificação contábil: por conta do plano, o saldo
 * antes do período, o movimento (débito/crédito) do período e o saldo ao fim —
 * como o Questor monta o balancete. Sintética soma as filhas.
 */
export interface BalanceteContabilLinha {
  conta: number;
  /** Classificação hierárquica (ex.: "1.1.01.002"); o nível = nº de segmentos. */
  classif: string;
  nivel: number;
  descricao: string;
  sintetica: boolean;
  /** Natureza cadastrada: "D" devedora, "C" credora. */
  natureza: "D" | "C";
  /** Saldo antes do período (sinal: devedor +, credor −). */
  saldoAnterior: number;
  /** Débito movimentado no período (magnitude, ≥ 0). */
  debito: number;
  /** Crédito movimentado no período (magnitude, ≥ 0). */
  credito: number;
  /** Saldo ao fim do período (sinal: devedor +, credor −). */
  saldoAtual: number;
}

export interface BalanceteContabilResp {
  empresa: { codigo: number; nome: string; cnpj: string | null };
  periodo: { inicio: string; fim: string; meses: string[] };
  /** Contas com saldo ou movimento no período, ordenadas por classificação. */
  linhas: BalanceteContabilLinha[];
  /** Maior profundidade da árvore (para o corte por nível). */
  nivelMax: number;
  /** Totais das analíticas: Σ débito e Σ crédito do período fecham entre si. */
  totais: {
    saldoAnteriorDevedor: number;
    saldoAnteriorCredor: number;
    debito: number;
    credito: number;
    saldoAtualDevedor: number;
    saldoAtualCredor: number;
    /** O balancete fecha? (Σ débito = Σ crédito e Σ saldo atual ≈ 0.) */
    fecha: boolean;
  };
  /**
   * Contas com saldo de sinal ATÍPICO (devedora com saldo credor ou vice-versa,
   * excluídas as redutoras). Empurrão proativo: aparecem em destaque ao gerar o
   * balancete, sem esperar a Análise. Ver validarBalancete.
   */
  atipicas: AnomaliaConta[];
}

/** Uma linha do balancete fiscal: movimento hipotético (regras) × real (fiscal). */
export interface BalanceteLinha {
  conta: number;
  /** Classificação hierárquica (ex.: "1.1.01.002"); o nível = nº de segmentos. */
  classif: string;
  nivel: number;
  descricao: string;
  sintetica: boolean;
  fiscalDeb: number;
  fiscalCred: number;
  realDeb: number;
  realCred: number;
}

/**
 * NFSE obrigada a contabilizar que NÃO foi lançada — some do balancete comum
 * (sem CFOP pro motor reproduzir, sem real pra espelhar). Entra no esperado na
 * conta prevista pela história do fornecedor, e é listada aqui como prova.
 */
export interface BalancetePendente {
  chave: number;
  numero: number | null;
  data: string;
  contraparte: string | null;
  origem: "ME" | "MS";
  valor: number;
  /** Conta prevista (moda do histórico do fornecedor); null se ele não tem histórico. */
  conta: number | null;
  contaDescr: string | null;
}

export interface BalanceteFiscalResp {
  /** Todas as contas com movimento, ordenadas por classificação (a tela corta por nível). */
  linhas: BalanceteLinha[];
  cobertura: { notas: number; componentesPulados: number };
  nivelMax: number;
  /** NFSE a contabilizar não refletidas no real (ver BalancetePendente). */
  pendentes: BalancetePendente[];
}

/** Um lançamento que compõe o movimento de uma conta (drill-down). */
export interface BalanceteLancamento {
  data: string;
  /** Prefixo da origem: ME/MS (nota), IM (apuração), RE (retenção), MOV (consolidação). */
  origem: string;
  /** Chave da nota — null em apuração/retenção (IM/RE), que não têm nota. */
  chave: number | null;
  conta: number;
  valor: number;
  historico: string;
  numero: number | null;
  contraparte: string | null;
  /** Espécie da nota (NFE, NFSE, CTE…) — null em apuração/retenção. */
  especie: string | null;
  /**
   * Só no drill-down do lado FISCAL: `regra` = valor esperado que o motor gerou
   * para a nota; `espelho` = movimento real espelhado (consolidação/apuração ou
   * conta sem regra). Ausente no drill-down do lado real.
   */
  tipo?: "regra" | "espelho";
}

export interface BalanceteLancamentosResp {
  lancamentos: BalanceteLancamento[];
  total: number;
}

/**
 * Uma nota "culpada" pela diferença de uma conta no balancete: o líquido que o
 * motor esperava nela × o que o contábil de fato lançou. A soma das `diferenca`
 * fecha com a diferença da conta.
 */
export interface BalanceteCulpado {
  chave: number | null;
  origem: string;
  numero: number | null;
  /** Espécie da nota (NFE, NFSE, CTE…) — NFSE o motor não reproduz, exige olhar manual. */
  especie: string | null;
  /**
   * Conta analítica onde a nota bate dentro do alvo: a lançada (real) quando há
   * lançamento, senão a esperada pela regra. Útil ao abrir uma sintética — diz em
   * qual filha a nota está.
   */
  conta: number | null;
  contraparte: string | null;
  /** Líquido (débito − crédito) esperado na conta pela regra. */
  esperado: number;
  /** Líquido (débito − crédito) real lançado na conta. */
  real: number;
  /** esperado − real (o quanto essa nota puxa a diferença). */
  diferenca: number;
  /** Conta analítica onde a regra ESPERAVA a nota (quando o motor a esperou no alvo). */
  contaEsperada: number | null;
  /**
   * - `valor`: lançada, mas com valor diferente do esperado (anomalia forte);
   * - `faltando`: esperada nesta conta e não lançada aqui (foi para outra);
   * - `conta_errada`: lançada aqui, mas o plano manda outra conta — o motor
   *   reproduziu a nota em conta diferente (anomalia de verdade);
   * - `interno`: numa sintética, lançada em outra conta DENTRO do próprio grupo —
   *   esperado = real no total (diferença 0), mas as duas analíticas ficam
   *   erradas; mostrado à parte pra reconciliação continuar exata;
   * - `extra`: lançada sem o motor esperar E sem plano reproduzível (NFSE/serviço
   *   ou CFOP sem tabela) — o motor não reproduz de jeito nenhum, exige olhar manual.
   */
  tipo: "valor" | "faltando" | "conta_errada" | "interno" | "extra";
}

export interface BalanceteCulpadosResp {
  culpados: BalanceteCulpado[];
  total: number;
}

/** Um override candidato a replicação para outra empresa. */
export interface ReplicarItem {
  cfop: number;
  /** Estab de ORIGEM do override (informativo — no destino grava como geral/0). */
  estab: number;
  descricao: string | null;
  contabiliza: boolean;
  observacao: string | null;
  linhas: LinhaPlano[];
  /** Contas fixas das linhas que NÃO existem no plano de contas do destino. */
  contasAusentes: number[];
  /** O destino já tem override para este CFOP — replicar substitui. */
  jaExiste: boolean;
}

export interface ReplicarPreviewResp {
  itens: ReplicarItem[];
}

export interface ReplicarResp {
  replicados: number;
  /** CFOPs pulados por conta ausente no destino. */
  pulados: number[];
}

/** Estabelecimento (filial) da empresa — cada um tem CNPJ próprio. */
export interface EstabInfo {
  codigo: number;
  nome: string | null;
  cnpj: string | null;
  uf: string | null;
}

export interface PlanoResp {
  empresa: number;
  estabs: EstabInfo[];
  /** Só a página atual. */
  cfops: PlanoCfop[];
  /** Quantos CFOPs passam no filtro/busca. */
  total: number;
  /** Quantos CFOPs a empresa tem cadastrados, sem filtro. */
  totalGeral: number;
  overrides: number;
  pagina: number;
  porPagina: number;
}

/** Tipos de divergência que a conferência aponta. */
export type TipoDivergencia = "conta" | "faltando" | "valor" | "natureza" | "extra";

export interface Divergencia {
  tipo: TipoDivergencia;
  /**
   * Lado do razão a que o apontamento se refere: 1 = débito, -1 = crédito.
   * É por onde se começa a procurar no Questor, então a tela mostra sempre.
   */
  natureza: 1 | -1;
  componente: string;
  detalhe: string;
  contaEsperada: number | null;
  contaLancada: number | null;
  valorEsperado: number | null;
  valorLancado: number | null;
}

/** Carga tributária efetiva por empresa (ICMS+IPI+ST+ISS ÷ faturamento). */
export interface TributosCargaEmpresa {
  codigo: number;
  nome: string;
  faturamento: number;
  tributos: number;
  carga: number;
}

/** Item (produto) de uma nota, no drill-down do explorador. */
export interface NotaItem {
  seq: number;
  produto: number;
  descricao: string | null;
  cfop: number;
  cfopDescr: string | null;
  unidade: string | null;
  quantidade: number;
  valorUnitario: number;
  valorTotal: number;
  icms: number;
  ipi: number;
}

/**
 * Rotatividade (turnover) do módulo Folha. Índice de RH:
 * ((admissões + desligamentos) / 2) ÷ colaboradores ativos × 100, onde
 * "ativos" é o efetivo no fim do intervalo (o denominador que o DP usa — bate
 * com o relatório de referência). Um ponto por mês, mais o consolidado do
 * período inteiro e a quebra por organograma (setor).
 */
export interface TurnoverPonto {
  /** Primeiro dia do mês, "YYYY-MM-DD" — o mesmo formato dos buckets do Fiscal. */
  mes: string;
  admissoes: number;
  desligamentos: number;
  /** Colaboradores ativos no fim do intervalo (denominador do índice). */
  ativos: number;
  /** Índice em %. Zero quando não há ativos (evita dividir por zero). */
  turnover: number;
}

/**
 * Turnover de um grupo (organograma, cargo…) no período — uma linha da quebra.
 * O mesmo formato serve para qualquer dimensão que agrupe contratos.
 */
export interface TurnoverGrupo {
  grupo: string;
  ativos: number;
  admissoes: number;
  desligamentos: number;
  turnover: number;
}

/** Uma contagem rotulada (motivo, faixa de tempo…) — quebra simples de nº. */
export interface TurnoverContagem {
  rotulo: string;
  valor: number;
}

/** O consolidado do período: os números do topo. */
export interface TurnoverConsolidado {
  admissoes: number;
  desligamentos: number;
  ativos: number;
  turnover: number;
  /** Admissões − desligamentos (crescimento líquido do efetivo). */
  saldo: number;
  /** Desligamentos por iniciativa do empregado (pedido, indireta…). */
  voluntarios: number;
  /** Desligamentos por iniciativa do empregador (sem/com justa causa…). */
  involuntarios: number;
  /** Tempo de casa médio de quem saiu, em dias (null se ninguém saiu). */
  tempoMedioCasaDias: number | null;
}

/** O período imediatamente anterior (mesma duração) — para os deltas dos KPIs. */
export interface TurnoverAnterior {
  turnover: number;
  admissoes: number;
  desligamentos: number;
  ativos: number;
}

export interface TurnoverResp {
  /** O período inteiro — vira os KPIs. */
  consolidado: TurnoverConsolidado;
  /** O período anterior, para comparar (deltas). */
  anterior: TurnoverAnterior;
  /** Um ponto por mês, para a série. */
  serie: TurnoverPonto[];
  /** Quebra por setor (organograma), do maior efetivo para o menor. */
  organogramas: TurnoverGrupo[];
  /** Quebra por cargo. */
  cargos: TurnoverGrupo[];
  /** Quebra por estabelecimento (filial). */
  estabelecimentos: TurnoverGrupo[];
  /** Turnover por sexo. */
  sexo: TurnoverGrupo[];
  /** Turnover por faixa etária. */
  faixaEtaria: TurnoverGrupo[];
  /** Turnover por escolaridade. */
  escolaridade: TurnoverGrupo[];
  /** Turnover por estado civil. */
  estadoCivil: TurnoverGrupo[];
  /** Turnover por horário (escala). */
  horarios: TurnoverGrupo[];
  /** Desligamentos por motivo (causa da rescisão). */
  motivos: TurnoverContagem[];
  /** Desligamentos por tempo de casa. */
  tenure: TurnoverContagem[];
}

/** Uma opção de filtro (setor, cargo, estabelecimento, vínculo). */
export interface FolhaOpcao {
  valor: string;
  rotulo: string;
  contratos: number;
}

/** Opções disponíveis para os filtros da Folha, na empresa selecionada. */
export interface FolhaFiltros {
  estabelecimentos: FolhaOpcao[];
  setores: FolhaOpcao[];
  cargos: FolhaOpcao[];
  vinculos: FolhaOpcao[];
  horarios: FolhaOpcao[];
}

/** Uma linha da lista de movimentações (quem foi admitido/desligado no período). */
export interface FolhaMovimentacao {
  codigoempresa: number;
  contrato: number;
  nome: string;
  dataadm: string | null;
  datadem: string | null;
  cargo: string;
  setor: string;
  motivo: string | null;
  tempoCasaDias: number | null;
  admitido: boolean;
  desligado: boolean;
}

/** Ficha do colaborador — o detalhe do modal. */
export interface FolhaFicha {
  contrato: number;
  nome: string;
  cpf: string | null;
  dataadm: string | null;
  datadem: string | null;
  tempoCasaDias: number | null;
  cargo: string | null;
  funcao: string | null;
  setor: string | null;
  estabelecimento: string | null;
  categoria: string | null;
  tipoVinculo: string | null;
  sexo: string;
  nascimento: string | null;
  idade: number | null;
  escolaridade: string | null;
  salario: number | null;
  tipoSalario: string | null;
  motivoDesligamento: string | null;
  cidade: string | null;
  uf: string | null;
}

// ── Análise de Balancete (motor determinístico + laudo opcional por IA) ──────

/** Conta cujo saldo final tem sinal contrário à sua natureza (violação de regra). */
export interface AnomaliaConta {
  conta: number;
  classif: string;
  descricao: string;
  natureza: "D" | "C";
  /** Saldo final (deb − cred): devedor positivo, credor negativo. */
  saldoFinal: number;
}

/** Validação contábil determinística: fecha, anomalias de sinal e cobertura. */
export interface ValidacaoBalancete {
  /** O balancete fecha? (Σ saldos devedores = Σ saldos credores, na tolerância.) */
  fecha: boolean;
  /** Quanto não fecha (Σ dos saldos das analíticas; 0 = fecha). */
  difFechamento: number;
  /** Contas com saldo de sinal atípico (devedora credora, ou credora devedora). */
  anomalias: AnomaliaConta[];
  cobertura: {
    mesesSolicitados: number;
    mesesComMovimento: number;
    primeiroMesComDado: string | null;
    temSaldoInicial: boolean;
  };
}

/**
 * Grupo PATRIMONIAL (estoque) do balanço: Ativo/Passivo Circulante e Não
 * Circulante e Patrimônio Líquido. Magnitude natural positiva, saldo acumulado.
 * O PL já vem RECONCILIADO (Ativo − Passivo exigível), então Ativo = Passivo+PL.
 */
export interface GrupoPatrimonial {
  chave: "ativoCirc" | "ativoNaoCirc" | "passivoCirc" | "passivoNaoCirc" | "pl";
  nome: string;
  /** Saldo (estoque) no último mês, magnitude natural positiva. */
  saldo: number;
  /** % do Ativo total (ativos) ou do Passivo+PL total (passivos/PL); null se n/a. */
  pctBase: number | null;
  /** Saldo acumulado ao fim de cada mês, na ordem de `meses`. */
  serie: number[];
}

/**
 * Linha da DRE condensada do PERÍODO — valor de FLUXO (movimento do intervalo),
 * não saldo acumulado. É o que corrige a leitura de receita/despesa mês a mês.
 */
export interface LinhaDRE {
  chave: string;
  nome: string;
  /** Fluxo no período, magnitude natural (deduções e resultado podem ser < 0). */
  valor: number;
  /** Análise vertical: % da receita líquida do período; null para a base/sem receita. */
  pctReceita: number | null;
  /** Fluxo de cada mês, na ordem de `meses`. */
  serie: number[];
  /** Linha de subtotal/resultado (ênfase visual), vs. linha de item. */
  destaque?: boolean;
}

/** Totais reconciliados do balanço — o Ativo fecha com Passivo + PL. */
export interface TotaisBalanco {
  /** Ativo total (circulante + não circulante), magnitude. */
  ativo: number;
  /** Passivo exigível (circulante + não circulante) — capital de terceiros. */
  passivo: number;
  /** PL reconciliado = Ativo − Passivo exigível (já inclui o resultado do exercício). */
  pl: number;
  /** PL só das contas de PL registradas no plano (2.4/2.5/2.6). */
  plRegistrado: number;
  /**
   * Resultado acumulado do exercício ainda NÃO transportado ao PL registrado
   * (pl − plRegistrado). Explica por que Ativo ≠ Passivo+PL antes da apuração.
   */
  resultadoExercicio: number;
}

/** Indicador financeiro calculado — determinístico. */
export interface IndicadorCalc {
  chave: string;
  nome: string;
  /** Valor no último mês; null quando não calculável com os dados. */
  valor: number | null;
  formatado: string;
  unidade: "indice" | "pct" | "reais";
  /** Faixa de leitura (cor): boa, atenção, ruim ou neutra. */
  faixa: "bom" | "atencao" | "ruim" | "neutro";
  interpretacao: string;
  tendencia: "melhora" | "estavel" | "piora" | "indef";
  serie: (number | null)[];
}

/** Achado do motor: inconsistência ou observação, com severidade. */
export interface Inconsistencia {
  severidade: "alta" | "media" | "baixa";
  tipo: string;
  titulo: string;
  detalhe: string;
  conta?: number;
  valor?: number;
}

/** Resultado do MOTOR determinístico — sem IA, roda no Executar (custo zero). */
export interface AnaliseDeterministica {
  /** Saúde geral, derivada por regra dos achados (não é opinião de IA). */
  saudeGeral: "forte" | "estavel" | "atencao" | "critica";
  fecha: boolean;
  difFechamento: number;
  cobertura: ValidacaoBalancete["cobertura"];
  /** Estrutura patrimonial (estoque, último mês). Ativo = Passivo + PL. */
  estrutura: GrupoPatrimonial[];
  /** Totais reconciliados do balanço (Ativo, Passivo exigível, PL). */
  totais: TotaisBalanco;
  /** DRE condensada do período (fluxo), na ordem de apresentação. */
  dre: LinhaDRE[];
  indicadores: IndicadorCalc[];
  inconsistencias: Inconsistencia[];
  meses: string[];
}

/** Resposta da rota principal (motor determinístico). */
export interface AnaliseBalanceteResp {
  analise: AnaliseDeterministica;
  empresa: { codigo: number; nome: string; cnpj: string | null };
  periodo: { inicio: string; fim: string; meses: string[] };
}

/** Resposta do laudo ESCRITO por IA (botão opcional; só aqui gasta API). */
export interface LaudoEscritoResp {
  texto: string;
  meta: { modelo: string; tokensEntrada: number; tokensSaida: number };
}
