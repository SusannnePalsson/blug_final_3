/**
 * Seed an admin user, prompting for password without echoing (so it won't appear in shell history).
 *
 * Usage:
 *   node scripts/seed-admin-prompt.mjs --username admin --email admin@blug.local
 *
 * Env:
 *   DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD
 */

import pgPromise from "pg-promise";
import argon2 from "argon2";

function getArg(flag) {
  const i = process.argv.indexOf(flag);
  if (i === -1) return null;
  return process.argv[i + 1] ?? null;
}

function promptHidden(question) {
  return new Promise((resolve) => {
    const stdin = process.stdin;
    const stdout = process.stdout;

    stdout.write(question);
    stdin.resume();
    stdin.setRawMode(true);
    stdin.setEncoding("utf8");

    let password = "";

    const onData = (ch) => {
      ch = String(ch);

      // Enter
      if (ch === "\r" || ch === "\n") {
        stdout.write("\n");
        stdin.setRawMode(false);
        stdin.pause();
        stdin.removeListener("data", onData);
        resolve(password);
        return;
      }

      // Ctrl+C
      if (ch === "\u0003") {
        stdout.write("\nCancelled.\n");
        process.exit(130);
      }

      // Backspace
      if (ch === "\u007f") {
        if (password.length > 0) password = password.slice(0, -1);
        return;
      }

      // Don't echo characters
      password += ch;
    };

    stdin.on("data", onData);
  });
}

const username = getArg("--username") ?? "admin";
const email = getArg("--email") ?? "admin@blug.local";

const password = await promptHidden("Enter admin password: ");
if (!password || password.length < 8) {
  console.error("Password must be at least 8 characters.");
  process.exit(1);
}

const confirm = await promptHidden("Confirm admin password: ");
if (password !== confirm) {
  console.error("Passwords do not match.");
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

  await t.none(`INSERT INTO roles(name) VALUES ('admin') ON CONFLICT DO NOTHING`);

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
