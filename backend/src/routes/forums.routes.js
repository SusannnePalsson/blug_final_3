import { Router } from "express";
import { z } from "zod";
import { getDb } from "../config/db.js";
import { slugify } from "../utils/slugify.js";

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

// GET /forums
router.get("/forums", async (req, res) => {
  const limit = Math.min(Number(req.query.limit ?? 50), 100);
  const offset = Math.max(Number(req.query.offset ?? 0), 0);

  const db = getDb();
  const forums = await db.any(
    `
    SELECT f.id,
           f.name,
           (SELECT COUNT(*)::int FROM threads t WHERE t.forum_id = f.id AND t.status = 'active') AS amount_of_threads
    FROM forums f
    WHERE f.status = 'active'
    ORDER BY f.name
    `
  );
  return res.json(forums);
});

// POST /forum (create forum)  body: { "name": "My Forum" }
router.post("/forum", requireAuth, async (req, res) => {
  const schema = z.object({
    name: z.string().min(2).max(80),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "Invalid forum payload." });

  const { name } = parsed.data;
  const db = getDb();

  const slug = slugify(name);
  try {
    await db.none(
      `
      INSERT INTO forums (name, slug, created_by)
      VALUES ($1, $2, $3)
      `,
      [name, slug, req.session.user.id]
    );
    return res.status(201).json({ message: "Forum has been created." });
  } catch (e) {
    // likely unique constraint
    return res.status(409).json({ message: "Forum name or slug already exists." });
  }
});

// PATCH /forums/:id
// body: { "name": null, "description": "text", "changeCreator": null }
// - creator can change name/description
// - only admin can changeCreator
router.patch("/forums/:id", requireAuth, async (req, res) => {
  const schema = z.object({
    name: z.string().min(2).max(80).nullable().optional(),
    description: z.string().max(2000).nullable().optional(),
    changeCreator: z.number().int().positive().nullable().optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "Invalid forum update payload." });

  const forumId = Number(req.params.id);
  const db = getDb();

  const forum = await db.oneOrNone(
    `SELECT id, created_by, status FROM forums WHERE id = $1`,
    [forumId]
  );
  if (!forum || forum.status !== "active") return res.status(404).json({ message: "Forum not found." });

  const isAdmin = req.session.user.role === "admin";
  const isCreator = forum.created_by === req.session.user.id;
  if (!isAdmin && !isCreator) return res.status(403).json({ message: "Forbidden." });

  const { name, description, changeCreator } = parsed.data;

  const updates = [];
  const values = [];
  let i = 1;

  if (name !== undefined) {
    if (name === null) {
      // ignore null (no change)
    } else {
      updates.push(`name = $${i++}`);
      values.push(name);
      updates.push(`slug = $${i++}`);
      values.push(slugify(name));
    }
  }

  if (description !== undefined) {
    if (description === null) {
      updates.push(`description = NULL`);
    } else {
      updates.push(`description = $${i++}`);
      values.push(description);
    }
  }

  if (changeCreator !== undefined) {
    if (!isAdmin) return res.status(403).json({ message: "Only admin can change creator." });
    if (changeCreator !== null) {
      updates.push(`created_by = $${i++}`);
      values.push(changeCreator);
    }
  }

  if (!updates.length) return res.status(400).json({ message: "No changes provided." });

  updates.push(`updated_at = now()`);

  values.push(forumId);
  try {
    await db.none(`UPDATE forums SET ${updates.join(", ")} WHERE id = $${i}`, values);
    return res.json({ message: "Forum updated." });
  } catch (e) {
    return res.status(409).json({ message: "Forum name/slug already in use." });
  }
});

// DELETE /forums/:id (admin: soft delete)
router.delete("/forums/:id", requireAdmin, async (req, res) => {
  const db = getDb();
  const forumId = Number(req.params.id);
  await db.none(`UPDATE forums SET status = 'deleted', updated_at = now() WHERE id = $1`, [forumId]);
  return res.json({ message: "Forum deleted." });
});

// Helper: forum detail + threads
async function forumWithThreadsBy(whereSql, param) {
  const db = getDb();
  const forum = await db.oneOrNone(
    `
    SELECT f.id, f.name,
           (SELECT COUNT(*)::int FROM threads t WHERE t.forum_id = f.id AND t.status = 'active') AS amount_of_threads
    FROM forums f
    WHERE f.status = 'active' AND ${whereSql}
    `,
    [param]
  );
  if (!forum) return null;

  const threads = await db.any(
    `
    SELECT t.id,
           t.title,
           t.created_at AS created,
           u.username AS owner,
           f.name AS forum
    FROM threads t
    JOIN users u ON u.id = t.owner_user_id
    JOIN forums f ON f.id = t.forum_id
    WHERE t.status = 'active' AND t.forum_id = $1
    ORDER BY t.created_at DESC
    `,
    [forum.id]
  );

  return { forum, threads };
}

// GET /forums/by-id/:id
router.get("/forums/by-id/:id", async (req, res) => {
  const data = await forumWithThreadsBy("f.id = $1", Number(req.params.id));
  if (!data) return res.status(404).json({ message: "Forum not found." });
  return res.json(data);
});

// GET /forums/by-name/:name
router.get("/forums/by-name/:name", async (req, res) => {
  const data = await forumWithThreadsBy("f.name = $1", req.params.name);
  if (!data) return res.status(404).json({ message: "Forum not found." });
  return res.json(data);
});

// GET /forums/by-slug/:slug
router.get("/forums/by-slug/:slug", async (req, res) => {
  const data = await forumWithThreadsBy("f.slug = $1", req.params.slug);
  if (!data) return res.status(404).json({ message: "Forum not found." });
  return res.json(data);
});

// GET /forum/:idOrSlugOrName  (smart endpoint)
// - numeric => by-id
// - otherwise => try slug first, then name
router.get("/forum/:idOrSlugOrName", async (req, res) => {
  const raw = req.params.idOrSlugOrName;

  // numeric id
  const asId = Number(raw);
  if (Number.isFinite(asId) && String(asId) === raw && asId > 0) {
    const data = await forumWithThreadsBy("f.id = $1", asId);
    if (!data) return res.status(404).json({ message: "Forum not found." });
    return res.json(data);
  }

  // slug (preferred)
  let data = await forumWithThreadsBy("f.slug = $1", raw);
  if (data) return res.json(data);

  // fallback: name
  data = await forumWithThreadsBy("f.name = $1", raw);
  if (!data) return res.status(404).json({ message: "Forum not found." });
  return res.json(data);
});

export default router;
