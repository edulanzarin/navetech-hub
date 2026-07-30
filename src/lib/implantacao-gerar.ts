import type { LinhaCasada, ParamsGeracao } from "./implantacao-tipos";

/**
 * Gera o arquivo de importação de lançamentos contábeis do Questor a partir do
 * balancete casado. NÃO escreve no banco — devolve o texto que o contador importa
 * no Questor (layout "Layout Importação Lançamento Contábeis").
 *
 * Cada conta com saldo de abertura vira UMA linha, lançada contra a conta
 * transitória de implantação ("Saldos a Implantar"):
 *  - saldo DEVEDOR  → débito na conta, crédito na transitória;
 *  - saldo CREDOR   → débito na transitória, crédito na conta.
 * Como o balancete fecha (Σ devedores = Σ credores), a transitória zera no fim.
 *
 * Formato da linha (uma partida por linha, delimitado por ';'):
 *   C;empresa;estab;DD/MM/AAAA;contaDeb;contaCred;histórico;complemento;valor
 * decimal com vírgula; TIPOLANCAMENTO='LN' e ORIGEMDADO='3' são fixados pelo
 * próprio layout do Questor, não vão no arquivo.
 */

/** Tolerância em reais para dizer que a transitória zerou. */
const TOL = 1;

export interface ResultadoGeracao {
  /** Conteúdo do arquivo (uma linha por lançamento, terminador CRLF). */
  arquivo: string;
  /** Quantas linhas (lançamentos) foram geradas. */
  linhas: number;
  /** Σ dos saldos devedores lançados. */
  totalDebito: number;
  /** Σ dos saldos credores lançados. */
  totalCredito: number;
  /** A transitória zera? (|Σdev − Σcred| < tolerância). */
  transitoriaZera: boolean;
  /** Linhas puladas por não terem conta de destino (precisam de de-para). */
  semConta: LinhaCasada[];
}

/** Data ISO "YYYY-MM-DD" → "DD/MM/AAAA". */
function dataQuestor(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}

/** Valor absoluto com 2 casas e vírgula decimal, sem separador de milhar. */
function valorQuestor(v: number): string {
  return Math.abs(v).toFixed(2).replace(".", ",");
}

/** Complemento livre: entre aspas só quando contém o separador ou aspas. */
function complementoQuestor(texto: string): string {
  if (texto.includes(";") || texto.includes('"')) {
    return `"${texto.replace(/"/g, '""')}"`;
  }
  return texto;
}

export function gerarArquivoImplantacao(
  casadas: LinhaCasada[],
  params: ParamsGeracao
): ResultadoGeracao {
  const data = dataQuestor(params.data);
  const semConta: LinhaCasada[] = [];
  const linhas: string[] = [];
  let totalDebito = 0;
  let totalCredito = 0;

  for (const c of casadas) {
    // Saldo zero não gera lançamento.
    if (Math.abs(c.origem.saldo) < 0.005) continue;
    if (c.conta == null || c.natureza == null) {
      semConta.push(c);
      continue;
    }

    const devedor = c.natureza === "D";
    const contaDeb = devedor ? c.conta : params.contaImplantacao;
    const contaCred = devedor ? params.contaImplantacao : c.conta;
    if (devedor) totalDebito += c.origem.saldo;
    else totalCredito += c.origem.saldo;

    linhas.push(
      [
        "C",
        params.empresa,
        params.estab,
        data,
        contaDeb,
        contaCred,
        params.codigoHistorico,
        complementoQuestor(params.complemento ?? ""),
        valorQuestor(c.origem.saldo),
      ].join(";")
    );
  }

  return {
    // CRLF: o layout do Questor é gerado no Windows (o .nli usa CRLF).
    arquivo: linhas.join("\r\n") + (linhas.length ? "\r\n" : ""),
    linhas: linhas.length,
    totalDebito,
    totalCredito,
    transitoriaZera: Math.abs(totalDebito - totalCredito) < TOL,
    semConta,
  };
}
