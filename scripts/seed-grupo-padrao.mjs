// Cria (ou atualiza) o grupo de empresas padrão "Todas menos NAVECON": todas as
// empresas do Questor exceto as do próprio escritório (nome com "NAVECON").
// Uso: node scripts/seed-grupo-padrao.mjs
//
// É um SNAPSHOT: empresas cadastradas depois no Questor não entram sozinhas —
// rode de novo para reconciliar. Idempotente (recria os itens do grupo).
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const raiz = join(dirname(fileURLToPath(import.meta.url)), "..");
for (const arquivo of [".env.local", ".env"]) {
  try {
    for (const linha of readFileSync(join(raiz, arquivo), "utf8").split("\n")) {
      const m = linha.match(/^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  } catch {}
}

const NOME = "Todas menos NAVECON";

const questor = new pg.Client({
  host: process.env.QUESTOR_DB_HOST,
  port: Number(process.env.QUESTOR_DB_PORT ?? 5432),
  database: process.env.QUESTOR_DB_NAME,
  user: process.env.QUESTOR_DB_USER,
  password: process.env.QUESTOR_DB_PASSWORD,
});
const app = new pg.Client({
  connectionString:
    process.env.APP_DB_URL ?? "postgres://navetechhub:navetechhub@localhost:5022/navetechhub",
});

await questor.connect();
await app.connect();
try {
  const { rows } = await questor.query(
    `select codigoempresa from empresa where nomeempresa not ilike '%navecon%' order by codigoempresa`
  );
  const codigos = rows.map((r) => r.codigoempresa);

  await app.query("begin");
  const g = await app.query(
    `insert into empresa_grupo (nome) values ($1)
     on conflict (nome) do update set nome = excluded.nome
     returning id`,
    [NOME]
  );
  const grupoId = g.rows[0].id;
  await app.query(`delete from empresa_grupo_item where grupo_id = $1`, [grupoId]);
  // Insert em lote via unnest — uma ida ao banco.
  await app.query(
    `insert into empresa_grupo_item (grupo_id, codigoempresa)
       select $1, x from unnest($2::int[]) as x`,
    [grupoId, codigos]
  );
  await app.query("commit");
  console.log(`Grupo "${NOME}" (id ${grupoId}) com ${codigos.length} empresas (NAVECON de fora).`);
} catch (err) {
  await app.query("rollback");
  console.error(`FALHOU: ${err.message}`);
  process.exitCode = 1;
} finally {
  await questor.end();
  await app.end();
}
