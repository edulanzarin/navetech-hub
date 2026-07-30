import type { LinhaOrigem } from "./implantacao-tipos";

/**
 * Entrada do balancete de origem no MVP: o usuário cola/sobe a tabela (CSV, TSV
 * ou colado do Excel/PDF). Isto vira `LinhaOrigem[]` no formato canônico. Parsers
 * dedicados por software (PDF do Systemar, do Patrimonium…) entram depois e
 * alimentam este mesmo canônico — o resto do pipeline não muda.
 *
 * Duas regras não-triviais moram aqui:
 *  - Só ANALÍTICAS entram. Sintéticas (grupos) também têm saldo no balancete;
 *    importá-las duplicaria valor. Folha = classificação que não é prefixo de
 *    nenhuma outra (a hierarquia do próprio balancete diz quem é grupo).
 *  - Natureza D/C vem da origem quando marcada (sufixo "D"/"C", parênteses,
 *    sinal); senão fica indefinida e o de-para resolve pela conta de destino.
 */

/** Índice de cada coluna na tabela de origem (0-based). */
export interface MapaColunas {
  chave: number;
  /** Coluna da classificação hierárquica; null quando a origem não expõe. */
  classif: number | null;
  descricao: number;
  /** Coluna do saldo de abertura (com D/C, parênteses ou sinal). */
  saldo: number;
}

/** Quebra o texto colado em linhas de células, detectando o separador. */
export function dividirTabela(texto: string): string[][] {
  const linhas = texto
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .filter((l) => l.trim().length > 0);
  if (!linhas.length) return [];

  // Separador: tab (colado do Excel) > ';' (CSV BR) > ',' > 2+ espaços (PDF).
  const amostra = linhas[0];
  const sep = amostra.includes("\t")
    ? "\t"
    : amostra.includes(";")
      ? ";"
      : amostra.includes(",")
        ? ","
        : /\s{2,}/;

  return linhas.map((l) =>
    (typeof sep === "string" ? l.split(sep) : l.split(sep)).map((c) => c.trim())
  );
}

const NORM = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

/** Tenta adivinhar o mapa de colunas pelos rótulos do cabeçalho. */
export function detectarColunas(header: string[]): MapaColunas | null {
  const h = header.map(NORM);
  const acha = (...alvos: string[]) =>
    h.findIndex((c) => alvos.some((a) => c.includes(a)));

  const chave = acha("codigo", "conta red", "cod");
  const descricao = acha("descric", "conta", "historico");
  // Saldo de abertura = "saldo atual" (fim do período de corte). Fallbacks: saldo.
  let saldo = acha("saldo atual", "saldo final");
  if (saldo < 0) saldo = h.findIndex((c) => c.includes("saldo") && !c.includes("anterior"));
  const classif = acha("classific");

  if (chave < 0 || descricao < 0 || saldo < 0) return null;
  return { chave, classif: classif < 0 ? null : classif, descricao, saldo };
}

/**
 * Interpreta uma célula de saldo: magnitude + natureza (quando a origem marca).
 * Aceita "8.955.354,63D", "1.234,56C", "(1.234,56)", "-1.234,56", "1.234,56".
 */
export function parseValor(raw: string): { saldo: number; natureza?: "D" | "C" } | null {
  let s = raw.trim();
  if (!s) return null;

  let natureza: "D" | "C" | undefined;
  const suf = s.slice(-1).toUpperCase();
  if (suf === "D" || suf === "C") {
    natureza = suf as "D" | "C";
    s = s.slice(0, -1).trim();
  }

  // Parênteses ou sinal negativo = crédito (valor negativo na coluna).
  let negativo = false;
  if (/^\(.*\)$/.test(s)) {
    negativo = true;
    s = s.slice(1, -1);
  }
  if (s.startsWith("-")) {
    negativo = true;
    s = s.slice(1);
  }

  // Formato BR: '.' milhar, ',' decimal. Remove milhar, troca vírgula por ponto.
  const num = parseFloat(s.replace(/\./g, "").replace(",", "."));
  if (!Number.isFinite(num)) return null;

  if (negativo && !natureza) natureza = "C";
  return { saldo: Math.abs(num), natureza };
}

/** v é ancestral (sintética) de w? Hierarquia por prefixo (com ou sem pontos). */
function ehAncestral(v: string, w: string): boolean {
  if (v === w) return false;
  if (v.includes(".")) return w.startsWith(v + ".");
  return w.startsWith(v) && w.length > v.length;
}

/**
 * Monta as linhas canônicas a partir da tabela. `temCabecalho` pula a 1ª linha.
 * Filtra sintéticas (grupos) e linhas sem saldo.
 */
export function montarLinhasOrigem(
  tabela: string[][],
  mapa: MapaColunas,
  temCabecalho: boolean
): LinhaOrigem[] {
  const corpo = temCabecalho ? tabela.slice(1) : tabela;

  // Bruto: só linhas com chave e saldo interpretável.
  const bruto = corpo
    .map((cols) => {
      const chave = cols[mapa.chave]?.trim() ?? "";
      const descricao = cols[mapa.descricao]?.trim() ?? "";
      const classif = mapa.classif != null ? cols[mapa.classif]?.trim() : undefined;
      const val = parseValor(cols[mapa.saldo] ?? "");
      if (!chave || !val) return null;
      return { chave, classif: classif || undefined, descricao, val };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  // Folha = valor de hierarquia (classif quando houver, senão a chave) que não é
  // prefixo de nenhum outro. Sintéticas caem fora.
  const hier = (r: (typeof bruto)[number]) => r.classif ?? r.chave;
  const todos = bruto.map(hier);
  const ehFolha = (r: (typeof bruto)[number]) => {
    const v = hier(r);
    return !todos.some((w) => ehAncestral(v, w));
  };

  return bruto
    .filter(ehFolha)
    .filter((r) => r.val.saldo > 0)
    .map((r) => ({
      chave: r.chave,
      classif: r.classif,
      descricao: r.descricao,
      saldo: r.val.saldo,
      natureza: r.val.natureza,
    }));
}
