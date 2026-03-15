import { Router } from "express";
import { z } from "zod";
import { getDb } from "../config/db.js";
import { hashPassword } from "../utils/password.js";

const router = Router();

function requireAuth(req, res, next) {
  if (!req.session.user) return res.status(401).json({ message: "Unauthorized." });
  return next();
}

function requireAdmin(req, res, next) {
  if (!req.session.user) return res.status(401).json({ message: "Unauthorized." });
  if (req.session.user.role !== "admin") return res.status(403).json({ message: "Forbidden." });
  return next();
}

function requireSelfOrAdmin(req, res, next) {
  if (!req.session.user) return res.status(401).json({ message: "Unauthorized." });
  const targetId = Number(req.params.id);
  if (req.session.user.role === "admin" || req.session.user.id === targetId) return next();
  return res.status(403).json({ message: "Forbidden." });
}

/**
 * POST /users (register)
 * body: { username, email, password }
 * response: { message: "You have registered." }
 */
router.post("/users", async (req, res) => {
  const schema = z.object({
    username: z.string().min(2).max(50),
    email: z.string().email().max(200),
    password: z.string().min(6).max(200),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid registration payload." });
  }

  const { username, email, password } = parsed.data;
  const db = getDb();

  const existing = await db.oneOrNone(
    `SELECT 1 FROM users WHERE username = $1 OR email = $2`,
    [username, email]
  );
  if (existing) {
    return res.status(409).json({ message: "Username or email already in use." });
  }

  const password_hash = await hashPassword(password);

  const created = await db.one(
    `
    INSERT INTO users (username, email, password_hash)
    VALUES ($1, $2, $3)
    RETURNING id
    `,
    [username, email, password_hash]
  );

  // Default role = member
  await db.none(
    `
    INSERT INTO user_roles (user_id, role_id)
    SELECT $1, id FROM roles WHERE name = 'member'
    `,
    [created.id]
  );

  return res.status(201).json({ message: "You have registered." });
});

/**
 * GET /users (admin only)
 */
router.get("/users", requireAdmin, async (req, res) => {
  const db = getDb();
  const users = await db.any(
    `SELECT id, username, email, status, created_at FROM users ORDER BY id`
  );
  return res.json(users);
});

/**
 * GET /users/:id (self or admin)
 */
router.get("/users/:id", requireSelfOrAdmin, async (req, res) => {
  const db = getDb();
  const user = await db.oneOrNone(
    `SELECT id, username, email, status, created_at FROM users WHERE id = $1`,
    [Number(req.params.id)]
  );
  if (!user) return res.status(404).json({ message: "User not found." });
  return res.json(user);
});

/**
 * PATCH /users/:id (self or admin)
 * body: { "username"?: "...", "password"?: "..." }
 */
router.patch("/users/:id", requireSelfOrAdmin, async (req, res) => {
  const schema = z.object({
    username: z.string().min(2).max(50).optional(),
    password: z.string().min(6).max(200).optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "Invalid update payload." });

  const { username, password } = parsed.data;
  if (!username && !password) return res.status(400).json({ message: "No changes provided." });

  const db = getDb();
  const id = Number(req.params.id);

  if (username) {
    const exists = await db.oneOrNone(
      `SELECT 1 FROM users WHERE username = $1 AND id <> $2`,
      [username, id]
    );
    if (exists) return res.status(409).json({ message: "Username already in use." });
  }

  const updates = [];
  const values = [];
  let i = 1;

  if (username) {
    updates.push(`username = $${i++}`);
    values.push(username);
  }
  if (password) {
    const password_hash = await hashPassword(password);
    updates.push(`password_hash = $${i++}`);
    values.push(password_hash);
  }

  updates.push(`updated_at = now()`);

  values.push(id);

  await db.none(
    `UPDATE users SET ${updates.join(", ")} WHERE id = $${i}`,
    values
  );

  return res.json({ message: "User updated." });
});

/**
 * DELETE /users/:id (self or admin) - soft delete
 */
router.delete("/users/:id", requireSelfOrAdmin, async (req, res) => {
  const db = getDb();
  const id = Number(req.params.id);

  await db.none(`UPDATE users SET status = 'deleted', updated_at = now() WHERE id = $1`, [id]);
  return res.json({ message: "User deleted." });
});

/**
 * GET /users/by-email/:email
 * response: { message: "Email is avalible." }
 */
router.get("/users/by-email/:email", async (req, res) => {
  const db = getDb();
  const email = req.params.email;
  const exists = await db.oneOrNone(`SELECT 1 FROM users WHERE email = $1`, [email]);

  if (exists) return res.status(409).json({ message: "Email is not available." });
  return res.json({ message: "Email is avalible." });
});

/**
 * GET /users/by-username/:username
 * response: { message: "Username is avalible." }
 */
router.get("/users/by-username/:username", async (req, res) => {
  const db = getDb();
  const username = req.params.username;
  const exists = await db.oneOrNone(`SELECT 1 FROM users WHERE username = $1`, [username]);

  if (exists) return res.status(409).json({ message: "Username is not available." });
  return res.json({ message: "Username is avalible." });
});

export default router;
