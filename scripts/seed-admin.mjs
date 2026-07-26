// Semeia (ou reseta) o usuário admin a partir de ADMIN_EMAIL / ADMIN_PASSWORD.
// Idempotente: rode quantas vezes quiser — cria se não existe, atualiza a senha
// e garante admin/todas_empresas se já existe. Uso: node scripts/seed-admin.mjs
//
// Migration é SQL puro e não hasheia senha; por isso o seed é um script JS. O
// formato do hash espelha src/lib/auth.ts (scrypt$N$salt_hex$hash_hex).
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { randomBytes, scrypt as scryptCb } from "node:crypto";
import { promisify } from "node:util";
import pg from "pg";

const scrypt = promisify(scryptCb);
const raiz = join(dirname(fileURLToPath(import.meta.url)), "..");

// Mesma precedência do Next: .env.local ganha do .env; shell ganha das duas.
for (const arquivo of [".env.local", ".env"]) {
  try {
    for (const linha of readFileSync(join(raiz, arquivo), "utf8").split("\n")) {
      const m = linha.match(/^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  } catch {}
}

const email = process.env.ADMIN_EMAIL;
const senha = process.env.ADMIN_PASSWORD;
if (!email || !senha) {
  console.error("Defina ADMIN_EMAIL e ADMIN_PASSWORD no .env (ou .env.local).");
  process.exit(1);
}

const SCRYPT_N = 16384;
async function hashSenha(s) {
  const salt = randomBytes(16);
  const hash = await scrypt(s, salt, 64, { N: SCRYPT_N });
  return `scrypt$${SCRYPT_N}$${salt.toString("hex")}$${hash.toString("hex")}`;
}

const client = new pg.Client({
  connectionString:
    process.env.APP_DB_URL ?? "postgres://navetechhub:navetechhub@localhost:5022/navetechhub",
});

await client.connect();
try {
  const senhaHash = await hashSenha(senha);
  const { rows } = await client.query(
    `insert into usuario (nome, email, senha_hash, ativo, admin, todas_empresas)
       values ('Administrador', $1, $2, true, true, true)
     on conflict (email) do update
       set senha_hash = excluded.senha_hash,
           ativo = true, admin = true, todas_empresas = true
     returning (xmax = 0) as criado`,
    [email, senhaHash]
  );
  console.log(rows[0].criado ? `Admin criado: ${email}` : `Admin atualizado: ${email}`);
} catch (err) {
  console.error(`FALHOU: ${err.message}`);
  process.exitCode = 1;
} finally {
  await client.end();
}
