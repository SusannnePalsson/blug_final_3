import pgPromise from "pg-promise";

let db = null;

export function createDb() {
  if (db) return db;

  const pgp = pgPromise();

  db = pgp({
    host: process.env.DB_HOST ?? "localhost",
    port: Number(process.env.DB_PORT ?? 5432),
    database: process.env.DB_NAME ?? "blug",
    user: process.env.DB_USER ?? "postgres",
    password: process.env.DB_PASSWORD ?? "",
    options: "-c search_path=public",
  });

  return db;
}

export function getDb() {
  if (!db) throw new Error("DB not initialized. Call createDb() first.");
  return db;
}
