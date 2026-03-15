import crypto from "crypto";

/**
 * CSRF protection (session-bound, with dev-friendly Postman support).
 *
 * Design:
 * - Token is generated once per session and stored in req.session.csrfToken
 * - Client must echo token for state-changing requests in header: X-CSRF-Token
 *
 * Dev ergonomics:
 * - In non-production, if request has NO Origin/Referer (typical for Postman/curl),
 *   we skip CSRF validation. Browser-based clients still send Origin and are protected.
 */
export function csrfInit(req, _res, next) {
  if (req.session && !req.session.csrfToken) {
    req.session.csrfToken = crypto.randomBytes(32).toString("hex");
  }
  // expose token for routes
  if (req.session) req.csrfToken = req.session.csrfToken;
  return next();
}

function safeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return false;
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}

export function csrfRequire(req, res, next) {
  const method = req.method.toUpperCase();
  if (["GET", "HEAD", "OPTIONS"].includes(method)) return next();

  // Dev-only bypass for non-browser clients (Postman/curl) that don't send Origin/Referer.
  if (process.env.NODE_ENV !== "production") {
    const origin = req.headers.origin;
    const referer = req.headers.referer;
    if (!origin && !referer) return next();
  }

  const expected = req.session?.csrfToken;
  if (!expected) return res.status(403).json({ message: "CSRF token missing (session)." });

  const provided = req.get("x-csrf-token") || req.body?.csrfToken;

  if (!provided || !safeEqual(provided, expected)) {
    return res.status(403).json({ message: "CSRF token invalid." });
  }
  return next();
}
