import { Router } from "express";
import { z } from "zod";
import { getDb } from "../config/db.js";
import { verifyPassword } from "../utils/password.js";

const router = Router();

/**
 * GET /login
 * response: { "username": "...", "role": "..." }
 */
router.get("/login", async (req, res) => {
  if (!req.session.user) {
    return res.status(200).json({ message: "Not logged in." });
  }
  return res.status(200).json({
    username: req.session.user.username,
    role: req.session.user.role,
  });
});

/**
 * POST /login
 * body: { "username": "user1", "password": "S3cure!" }
 * response: { message: "Welcome username!" }
 */
router.post("/login", async (req, res) => {

  // ✅ NEW BEHAVIOR: if already logged in, return a friendly 200
  if (req.session.user) {
    return res.status(200).json({
      message: "You are already logged in.",
      username: req.session.user.username,
      role: req.session.user.role,
      csrfToken: req.session.csrfToken ?? null,
    });
  }

  const schema = z.object({
    username: z.string().min(2).max(50),
    password: z.string().min(6).max(200),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid login payload." });
  }

  const { username, password } = parsed.data;
  const db = getDb();

  const user = await db.oneOrNone(
    `
    SELECT u.id, u.username, u.password_hash, u.status,
           COALESCE(r.name, 'member') AS role
    FROM users u
    LEFT JOIN user_roles ur ON ur.user_id = u.id
    LEFT JOIN roles r ON r.id = ur.role_id
    WHERE u.username = $1
    LIMIT 1
    `,
    [username]
  );

  // Keep same generic error to avoid username enumeration
  if (!user || user.status !== "active") {
    return res
      .status(404)
      .json({ message: "No user found! Wrong username or password." });
  }

  const ok = await verifyPassword(user.password_hash, password);
  if (!ok) {
    return res
      .status(404)
      .json({ message: "No user found! Wrong username or password." });
  }

  req.session.user = {
    id: user.id,
    username: user.username,
    role: user.role,
  };

  // ✅ 200 is more correct than 201 for login
  return res.status(200).json({
    message: `Welcome ${user.username}!`,
    csrfToken: req.session.csrfToken ?? null,
  });
});

/**
 * DELETE /login
 * response: { message: "You have logged out." }
 */
router.delete("/login", async (req, res) => {
  if (!req.session.user) {
    return res.status(404).json({ message: "You are not logged in." });
  }

  req.session.destroy((err) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: "Could not log out." });
    }
    return res.status(200).json({ message: "You have logged out." });
  });
});

export default router;
