/**
 * Seed an admin user directly into PostgreSQL (no manual SQL hash pasting).
 *
 * Usage:
 *   1) Ensure DB is created + 001_init.sql has been run.
 *   2) Set env (or .env in Blug.Api) for DB connection:
 *      DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD
 *   3) Run:
 *      node scripts/seed-admin.mjs --username admin --email admin@blug.local --password "YourStrongPassword"
 *
 * Notes:
 * - Idempotent: if user exists, it will ensure admin role is assigned.
 */

import pgPromise from "pg-promise";
import argon2 from "argon2";

function getArg(flag) {
  const i = process.argv.indexOf(flag);
  if (i === -1) return null;
  return process.argv[i + 1] ?? null;
}

const username = getArg("--username") ?? "admin";
const email = getArg("--email") ?? "admin@blug.local";
const password = getArg("--password");

if (!password) {
  console.error('Missing --password. Example: node scripts/seed-admin.mjs --password "YourStrongPassword"');
  process.exit(1);
}

const dbHost = process.env.DB_HOST ?? "localhost";
const dbPort = Number(process.env.DB_PORT ?? 5432);
const dbName = process.env.DB_NAME ?? "blug";
const dbUser = process.env.DB_USER ?? "postgres";
const dbPassword = process.env.DB_PASSWORD ?? "";

const pgp = pgPromise();
const db = pgp({
  host: dbHost,
  port: dbPort,
  database: dbName,
  user: dbUser,
  password: dbPassword,
});

const hash = await argon2.hash(password, { type: argon2.argon2id });

await db.tx(async (t) => {
  await t.none(
    `
    INSERT INTO users (username, email, password_hash, status)
    VALUES ($1, $2, $3, 'active')
    ON CONFLICT (username) DO NOTHING
    `,
    [username, email, passwordHash]
  );

  // Ensure admin role exists (should from 001_init)
  await t.none(`INSERT INTO roles(name) VALUES ('admin') ON CONFLICT DO NOTHING`);

  // Ensure admin role assigned
  await t.none(
    `
    INSERT INTO user_roles (user_id, role_id)
    SELECT u.id, r.id
    FROM users u
    JOIN roles r ON r.name = 'admin'
    WHERE u.username = $1
    ON CONFLICT DO NOTHING
    `,
    [username]
  );
});

console.log(`Admin ensured: username="${username}" email="${email}" role="admin"`);
