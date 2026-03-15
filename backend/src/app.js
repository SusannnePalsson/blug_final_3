import express from "express";
import helmet from "helmet";
import cors from "cors";

import { createDb } from "./config/db.js";
import { sessionMiddleware } from "./middleware/session.js";
import { apiLimiter, authLimiter } from "./middleware/rateLimit.js";
import acl from "./middleware/acl.js";

import loginRoutes from "./routes/login.routes.js";
import userRoutes from "./routes/users.routes.js";
import forumsRoutes from "./routes/forums.routes.js";
import threadsRoutes from "./routes/threads.routes.js";
import postsRoutes from "./routes/posts.routes.js";
import csrfRoutes from "./routes/csrf.routes.js";
import { csrfInit, csrfRequire } from "./middleware/csrf.js";

export function createApp() {
  const app = express();

  // Parse JSON only on methods that normally carry a body
  const jsonParser = express.json({ limit: "50kb" });
  app.use((req, res, next) => {
    const m = req.method.toUpperCase();
    if (m === "POST" || m === "PUT" || m === "PATCH" || m === "DELETE") {
      return jsonParser(req, res, next);
    }
    return next();
  });

  // Also allow urlencoded (harmless, helps some clients)
  app.use(express.urlencoded({ extended: false }));

  app.use(helmet());

  app.use(
    cors({
      origin: process.env.CORS_ORIGIN ?? "http://localhost:5173",
      credentials: true,
    })
  );

  // Initialize DB once
  createDb();

  // Sessions MUST come before csrfInit
  app.use(sessionMiddleware());

  // CSRF token per session (must be after sessions)
  app.use(csrfInit);

  // Rate limiting: global + stricter for auth routes
  app.use(apiLimiter);
  app.use("/login", authLimiter);
  app.use("/users", authLimiter);

  // ACL (role gate)
  app.use(acl);

  // Routes that should NOT require CSRF (so you can login/register and fetch token)
  // IMPORTANT: csrfRequire must be applied AFTER these routes are mounted
  app.use(loginRoutes);
  app.use(userRoutes);
  app.use(csrfRoutes);

  // CSRF protection for state-changing requests for the rest of the API
  app.use(csrfRequire);

  // Remaining API routes (protected by CSRF for POST/PATCH/DELETE)
  app.use(forumsRoutes);
  app.use(threadsRoutes);
  app.use(postsRoutes);

  app.get("/", (req, res) => res.json({ message: "Blug API is running." }));

  // 404 handler (nice for debugging)
  app.use((req, res) => {
    res.status(404).json({ message: "Not found." });
  });

  // Error handler
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    if (err?.type === "entity.parse.failed") {
      return res.status(400).json({ message: "Invalid JSON body." });
    }
    console.error(err);
    return res.status(500).json({ message: "Server error." });
  });

  return app;
}
