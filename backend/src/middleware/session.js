import session from "express-session";

/**
 * Starter session middleware.
 * - Uses secure cookie options
 * - Defaults to MemoryStore in development
 *
 * For production / multi-instance:
 * - Use a persistent store (e.g. Postgres via connect-pg-simple).
 * - This starter includes the `session` table in DB migration (001_init.sql).
 */
let cached = null;

export function sessionMiddleware() {
  if (cached) return cached;

  const isProd = process.env.NODE_ENV === "production";
  const secret = process.env.SESSION_SECRET ?? "dev-secret-change-me";

  cached = session({
    secret,
    resave: false,
    saveUninitialized: false,
    name: "blug.sid",
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: isProd,
      maxAge: 1000 * 60 * 60 * 8, // 8 hours
    },
  });

  return cached;
}
