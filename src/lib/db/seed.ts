/**
 * Executa DDL + seed SQL no Postgres.
 * Uso: DATABASE_URL=... npm run db:seed
 */
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import postgres from "postgres";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("Defina DATABASE_URL no ambiente.");
    process.exit(1);
  }

  const sql = postgres(url, { max: 1 });
  const root = process.cwd();

  const ddl = fs.readFileSync(path.join(root, "sql/001_create_tables.sql"), "utf8");
  const seed = fs.readFileSync(path.join(root, "sql/002_seed_candidates.sql"), "utf8");

  await sql.unsafe(ddl);
  await sql.unsafe(seed);

  console.log("Seed concluído (tabelas + candidatos + stats iniciais).");
  await sql.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
