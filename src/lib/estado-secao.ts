import { secaoContabilAtual } from "./contabil-secoes";
import { secaoAtual } from "./fiscal-secoes";

/**
 * Estado de tela que sobrevive à navegação dentro de uma seção do menu lateral.
 *
 * O fluxo real de uso vai e volta entre as abas de um mesmo assunto — ver uma
 * pendência na Conferência, ajustar o plano na Configuração, voltar. Refazer a
 * busca e os filtros a cada ida e volta é trabalho jogado fora.
 *
 * Sair da seção limpa: o filtro que fazia sentido num assunto não faz no
 * próximo, e voltar dias depois numa tela pré-filtrada esconde dados sem avisar.
 *
 * Vive num Map de módulo, e não no cache do React Query, porque isto é estado
 * de interface e não resposta de servidor — no React Query, uma chave sem
 * observador é coletada pelo `gcTime` e o estado sumiria sozinho depois de
 * alguns minutos parado.
 */
const estados = new Map<string, unknown>();

// Ouvintes do store: quem lê via useEstadoSecao re-renderiza quando qualquer
// campo muda. É o que permite a barra do shell e a página compartilharem o
// mesmo campo (a conta escolhida na barra aparece na página na hora).
const ouvintes = new Set<() => void>();

export function assinarEstado(fn: () => void): () => void {
  ouvintes.add(fn);
  return () => {
    ouvintes.delete(fn);
  };
}

function notificar(): void {
  ouvintes.forEach((fn) => fn());
}

/**
 * Identidade da seção a que o caminho pertence. É o `path` da seção, não o
 * `id`, porque ids se repetem entre módulos e o caminho é único.
 */
export function idDaSecao(pathname: string): string {
  const secao = secaoContabilAtual(pathname) ?? secaoAtual(pathname);
  return secao?.path ?? pathname;
}

/**
 * A chave é da **página**, não da seção: `busca` na Conferência e `busca` na
 * Configuração são coisas diferentes, ainda que as duas abas pertençam à mesma
 * seção. O que a seção decide é o tempo de vida, não a identidade — por isso ela
 * vem na frente da chave, e limpar a seção alcança as suas páginas todas.
 *
 * Separador é NUL: não aparece em caminho nem em nome de campo, então dois
 * pares diferentes nunca formam a mesma chave.
 */
const SEP = "\u0000";

function chave(secao: string, pagina: string, campo: string): string {
  return `${secao}${SEP}${pagina}${SEP}${campo}`;
}

export function lerEstado<T>(secao: string, pagina: string, campo: string): T | undefined {
  return estados.get(chave(secao, pagina, campo)) as T | undefined;
}

export function guardarEstado<T>(
  secao: string,
  pagina: string,
  campo: string,
  valor: T
): void {
  estados.set(chave(secao, pagina, campo), valor);
  notificar();
}

export function limparEstadoSecao(secao: string): void {
  const prefixo = `${secao}${SEP}`;
  for (const k of estados.keys()) if (k.startsWith(prefixo)) estados.delete(k);
  notificar();
}

/**
 * "Esta ABA já foi executada?" — para o resultado de uma aba (Balancete) seguir
 * na tela ao ir noutra aba do mesmo assunto (Análise) e voltar, sem reexecutar.
 * Vive no mesmo Map (mesmo tempo de vida: morre ao sair da seção) sob uma página
 * reservada `exec`. Não notifica: é lido no render do shell, que já re-renderiza
 * ao navegar entre abas.
 */
export function marcarAbaExecutada(secao: string, aba: string): void {
  estados.set(chave(secao, "exec", aba), true);
}

export function abaFoiExecutada(secao: string, aba: string): boolean {
  return estados.get(chave(secao, "exec", aba)) === true;
}
