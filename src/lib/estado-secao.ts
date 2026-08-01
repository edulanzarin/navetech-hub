import { secaoContabilAtual } from "./contabil-secoes";
import { secaoAtual } from "./fiscal-secoes";

/**
 * Estado de tela que sobrevive à navegação DENTRO de um módulo: trocar de seção
 * (Conferência -> Balancete -> voltar) mantém o que já estava carregado — busca,
 * espécies escolhidas, extrato/prévia importados — e só "Trocar módulo" descarta.
 * É o que evita reescolher tudo e recarregar a cada ida e volta.
 *
 * A chave carrega a seção (ver `chave`), então cada seção guarda o SEU recorte
 * sem enxergar o da outra — não há vazamento de um assunto pro próximo. O que
 * muda com isto é só o tempo de vida: quem descarta é o shell do módulo, no seu
 * unmount (ver `limparEstadoDoModulo`).
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
 * seção. A seção vem na frente só para separar os recortes (uma não vê o da
 * outra); o tempo de vida é do módulo, e limpar por prefixo do módulo alcança as
 * páginas de todas as suas seções.
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

/**
 * Descarta TODO o estado das seções de um módulo (base = "/contabil", "/fiscal",
 * "/folha"). Chamado pelo shell no seu unmount, que só acontece ao SAIR do módulo
 * — é o que faz o estado carregado sobreviver à troca de seção e cair só em
 * "Trocar módulo". A base casa com o começo do caminho da seção (`/contabil/…`).
 */
export function limparEstadoDoModulo(base: string): void {
  const prefixo = `${base}/`;
  for (const k of estados.keys()) if (k.startsWith(prefixo)) estados.delete(k);
  notificar();
}

/**
 * "Esta ABA já foi executada?" — para o resultado de uma aba (Balancete) seguir
 * na tela ao ir noutra aba do mesmo assunto (Análise) e voltar, sem reexecutar.
 * Vive no mesmo Map (mesmo tempo de vida: morre ao sair do módulo) sob uma página
 * reservada `exec`. Não notifica: é lido no render do shell, que já re-renderiza
 * ao navegar entre abas.
 */
export function marcarAbaExecutada(secao: string, aba: string): void {
  estados.set(chave(secao, "exec", aba), true);
}

export function abaFoiExecutada(secao: string, aba: string): boolean {
  return estados.get(chave(secao, "exec", aba)) === true;
}
