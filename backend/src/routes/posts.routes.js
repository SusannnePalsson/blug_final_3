import { Router } from "express";
import { z } from "zod";
import { getDb } from "../config/db.js";
import { audit } from "../utils/audit.js";

const router = Router();

console.log("LOADED posts.routes.js v2026-03-12");

function requireAuth(req, res, next) {
  if (!req.session?.user) return res.status(401).json({ message: "Unauthorized." });
  return next();
}

function normalizeStatus(v) {
  return String(v ?? "").trim().toLowerCase();
}

function normalizeRole(v) {
  return String(v ?? "").trim().toLowerCase();
}

function normalizeVisibility(v) {
  return String(v ?? "").trim().toLowerCase();
}

async function getThreadForPost(db, postId) {
  return db.oneOrNone(
    `
    SELECT
      p.id            AS post_id,
      p.thread_id     AS thread_id,
      p.author_user_id,
      p.status        AS post_status,
      t.status        AS thread_status,
      t.owner_user_id,
      t.visibility
    FROM posts p
    JOIN threads t ON t.id = p.thread_id
    WHERE p.id = $1
    LIMIT 1
    `,
    [postId]
  );
}

async function isModeratorOrOwnerOrAdmin(db, threadId, user) {
  if (!user) return false;
  if (normalizeRole(user.role) === "admin") return true;

  const t = await db.oneOrNone(
    `SELECT owner_user_id FROM threads WHERE id = $1`,
    [threadId]
  );
  if (!t) return false;

  if (Number(t.owner_user_id) === Number(user.id)) return true;

  const m = await db.oneOrNone(
    `SELECT 1 FROM thread_members WHERE thread_id = $1 AND user_id = $2 AND member_role = 'moderator'`,
    [threadId, user.id]
  );
  return !!m;
}

/**
 * POST /posts
 * body: { threadId: number, text: string }
 */
router.post("/posts", requireAuth, async (req, res) => {
  const schema = z.object({
    threadId: z.number().int().positive(),
    text: z.string().min(1).max(10000),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid post payload." });
  }

  const db = getDb();
  const { threadId, text } = parsed.data;

  const thread = await db.oneOrNone(
    `SELECT id, visibility, owner_user_id, status FROM threads WHERE id = $1`,
    [threadId]
  );

  if (!thread || normalizeStatus(thread.status) !== "active") {
    return res.status(404).json({ message: "Thread not found." });
  }

  const sessionUser = req.session.user;
  const isAdmin = normalizeRole(sessionUser.role) === "admin";
  const isOwner = Number(thread.owner_user_id) === Number(sessionUser.id);

  const member = await db.oneOrNone(
    `SELECT 1 FROM thread_members WHERE thread_id = $1 AND user_id = $2`,
    [threadId, sessionUser.id]
  );

  console.log("POST /posts access debug:", {
    threadId,
    threadVisibility: normalizeVisibility(thread.visibility),
    threadStatus: normalizeStatus(thread.status),
    threadOwnerUserId: thread.owner_user_id,
    sessionUser: {
      id: sessionUser?.id,
      username: sessionUser?.username,
      role: sessionUser?.role,
    },
    isAdmin,
    isOwner,
    isMember: !!member,
    requestBody: parsed.data,
  });

  if (
    normalizeVisibility(thread.visibility) === "private" &&
    !isAdmin &&
    !isOwner &&
    !member
  ) {
    console.log("POST /posts access denied:", {
      reason: "private_thread_not_member",
      threadId,
      userId: sessionUser?.id,
    });
    return res.status(403).json({ message: "Access forbidden" });
  }

  const created = await db.one(
    `
    INSERT INTO posts (thread_id, author_user_id, text)
    VALUES ($1, $2, $3)
    RETURNING id
    `,
    [threadId, sessionUser.id, text]
  );

  console.log("POST /posts created:", {
    postId: created.id,
    threadId,
    userId: sessionUser?.id,
  });

  return res.status(201).json({ message: "Post created.", id: created.id });
});

/**
 * PATCH /posts/:id
 * body: { text: string }
 * Author, moderator, thread owner or admin may edit
 */
router.patch("/posts/:id", requireAuth, async (req, res) => {
  const schema = z.object({
    text: z.string().min(1).max(10000),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid post update payload." });
  }

  const db = getDb();
  const postId = Number(req.params.id);

  const row = await getThreadForPost(db, postId);
  if (!row) return res.status(404).json({ message: "Post not found." });

  const isAdmin = normalizeRole(req.session.user.role) === "admin";
  const isAuthor = Number(row.author_user_id) === Number(req.session.user.id);
  const canModerate = await isModeratorOrOwnerOrAdmin(db, row.thread_id, req.session.user);

  console.log("PATCH /posts/:id permission debug:", {
    postId,
    threadId: row.thread_id,
    sessionUser: {
      id: req.session.user?.id,
      username: req.session.user?.username,
      role: req.session.user?.role,
    },
    isAdmin,
    isAuthor,
    canModerate,
  });

  if (!isAdmin && !isAuthor && !canModerate) {
    return res.status(403).json({ message: "Forbidden." });
  }

  await db.none(
    `UPDATE posts SET text = $1, updated_at = now() WHERE id = $2 AND status = 'active'`,
    [parsed.data.text, postId]
  );

  return res.json({ message: "Post updated." });
});

/**
 * DELETE /posts/:id
 * Delete own post OR moderator/owner/admin (soft delete)
 */
router.delete("/posts/:id", requireAuth, async (req, res) => {
  const db = getDb();
  const postId = Number(req.params.id);

  const row = await getThreadForPost(db, postId);
  const isAdmin = normalizeRole(req.session.user.role) === "admin";
  const threadStatus = normalizeStatus(row?.thread_status);

  console.log("DELETE /posts debug:", {
    postId,
    hasRow: !!row,
    threadId: row?.thread_id,
    threadStatus,
    postStatus: normalizeStatus(row?.post_status),
    sessionUser: {
      id: req.session.user?.id,
      username: req.session.user?.username,
      role: req.session.user?.role,
    },
  });

  if (!row) return res.status(404).json({ message: "Post not found." });

  if (threadStatus !== "active" && !isAdmin) {
    return res.status(404).json({ message: "Thread not found." });
  }

  const isAuthor = Number(row.author_user_id) === Number(req.session.user.id);
  const canModerate = await isModeratorOrOwnerOrAdmin(db, row.thread_id, req.session.user);

  console.log("DELETE /posts permission debug:", {
    postId,
    isAdmin,
    isAuthor,
    canModerate,
  });

  if (!isAdmin && !isAuthor && !canModerate) {
    return res.status(403).json({ message: "Forbidden." });
  }

  await db.none(
    `UPDATE posts SET status='deleted', updated_at = now() WHERE id = $1`,
    [postId]
  );

  await audit(req, {
    action: "post.delete",
    targetType: "post",
    targetId: postId,
    metadata: { threadId: row.thread_id },
  });

  return res.json({ message: "Post deleted." });
});

/**
 * PATCH /posts/:id/block
 */
router.patch("/posts/:id/block", requireAuth, async (req, res) => {
  const db = getDb();
  const postId = Number(req.params.id);

  const row = await getThreadForPost(db, postId);
  if (!row) return res.status(404).json({ message: "Post not found." });

  const isAdmin = normalizeRole(req.session.user.role) === "admin";
  const threadStatus = normalizeStatus(row.thread_status);

  console.log("PATCH /posts/:id/block debug:", {
    postId,
    threadId: row.thread_id,
    threadStatus,
    sessionUser: {
      id: req.session.user?.id,
      username: req.session.user?.username,
      role: req.session.user?.role,
    },
    isAdmin,
  });

  if (threadStatus !== "active" && !isAdmin) {
    return res.status(404).json({ message: "Thread not found." });
  }

  const canModerate = await isModeratorOrOwnerOrAdmin(db, row.thread_id, req.session.user);

  console.log("PATCH /posts/:id/block permission debug:", {
    postId,
    canModerate,
  });

  if (!canModerate) return res.status(403).json({ message: "Forbidden." });

  await db.none(
    `UPDATE posts SET status='blocked', updated_at = now() WHERE id = $1`,
    [postId]
  );

  await audit(req, {
    action: "post.block",
    targetType: "post",
    targetId: postId,
    metadata: { threadId: row.thread_id },
  });

  return res.json({ message: "Post blocked." });
});

/**
 * PATCH /posts/:id/restore (admin)
 */
router.patch("/posts/:id/restore", requireAuth, async (req, res) => {
  const db = getDb();
  const postId = Number(req.params.id);

  console.log("PATCH /posts/:id/restore debug:", {
    postId,
    sessionUser: {
      id: req.session.user?.id,
      username: req.session.user?.username,
      role: req.session.user?.role,
    },
  });

  if (normalizeRole(req.session.user.role) !== "admin") {
    return res.status(403).json({ message: "Forbidden." });
  }

  const exists = await db.oneOrNone(`SELECT 1 FROM posts WHERE id = $1`, [postId]);
  if (!exists) return res.status(404).json({ message: "Post not found." });

  await db.none(
    `UPDATE posts SET status='active', updated_at = now() WHERE id = $1`,
    [postId]
  );

  await audit(req, {
    action: "post.restore",
    targetType: "post",
    targetId: postId,
  });

  return res.json({ message: "Post restored." });
});

export default router;