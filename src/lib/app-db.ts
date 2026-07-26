import { Pool, types } from "pg";

// Mesmos parsers do pool do Questor: DATE como string, numéricos como number
types.setTypeParser(types.builtins.DATE, (v) => v);
types.setTypeParser(types.builtins.NUMERIC, (v) => parseFloat(v));
types.setTypeParser(types.builtins.INT8, (v) => Number(v));

declare global {
  var _appPool: Pool | undefined;
}

/**
 * Banco PRÓPRIO do app (gravável) — não confundir com o pool do Questor, que é
 * produção e somente leitura. Aqui moram os overrides do plano de
 * contabilização e, futuramente, usuários e permissões.
 */
export const appPool =
  global._appPool ??
  new Pool({
    connectionString:
      process.env.APP_DB_URL ?? "postgres://navetechhub:navetechhub@localhost:5022/navetechhub",
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
    options: "-c statement_timeout=30000",
  });

if (process.env.NODE_ENV !== "production") global._appPool = appPool;

/** Falha no banco do app — distinta de falha no Questor, que tem outra causa. */
export class AppDbError extends Error {}

/**
 * Erro de conexão do pg vem como AggregateError de mensagem VAZIA quando tenta
 * IPv4 e IPv6 e as duas recusam. Sem isto o usuário vê um erro em branco.
 */
export function erroAppDb(err: unknown): AppDbError {
  const codigos = new Set<string>();
  const visitar = (e: unknown) => {
    const c = (e as { code?: string })?.code;
    if (c) codigos.add(c);
    for (const sub of (e as { errors?: unknown[] })?.errors ?? []) visitar(sub);
  };
  visitar(err);

  if (codigos.has("ECONNREFUSED") || codigos.has("ENOTFOUND") || codigos.has("ETIMEDOUT")) {
    return new AppDbError(
      "Banco do app fora do ar — suba com `npm run db:up` (desenvolvimento) ou `docker compose up -d` (produção)"
    );
  }
  const msg = err instanceof Error && err.message ? err.message : String(err);
  return new AppDbError(`Falha no banco do app: ${msg}`);
}

export async function appQuery<T = Record<string, unknown>>(
  text: string,
  params: unknown[] = []
): Promise<T[]> {
  try {
    const result = await appPool.query(text, params);
    return result.rows as T[];
  } catch (err) {
    throw erroAppDb(err);
  }
}
