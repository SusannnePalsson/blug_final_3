import { Router } from "express";
import { z } from "zod";
import { getDb } from "../config/db.js";
import { audit } from "../utils/audit.js";

const router = Router();

function requireAuth(req, res, next) {
  if (!req.session.user) return res.status(401).json({ message: "Unauthorized." });
  return next();
}

async function isModeratorOrOwner(db, threadId, userId) {
  const t = await db.oneOrNone(
    `SELECT owner_user_id FROM threads WHERE id = $1 AND status = 'active'`,
    [threadId]
  );
  if (!t) return { ok: false, reason: "not_found" };

  if (Number(t.owner_user_id) === Number(userId)) {
    return { ok: true, role: "owner", ownerId: t.owner_user_id };
  }

  const m = await db.oneOrNone(
    `SELECT 1 FROM thread_members WHERE thread_id = $1 AND user_id = $2 AND member_role = 'moderator'`,
    [threadId, userId]
  );

  return { ok: !!m, role: m ? "moderator" : "none", ownerId: t.owner_user_id };
}

async function canReadThread(db, threadId, sessionUser) {
  const thread = await db.oneOrNone(
    `SELECT id, visibility, owner_user_id, status FROM threads WHERE id = $1`,
    [threadId]
  );

  if (!thread || String(thread.status).toLowerCase() !== "active") {
    return { ok: false, reason: "not_found" };
  }

  if (String(thread.visibility).toLowerCase() === "public") {
    return { ok: true };
  }

  if (!sessionUser) {
    return { ok: false, reason: "private" };
  }

  const role = String(sessionUser.role ?? "").toLowerCase();
  if (role === "admin") {
    return { ok: true };
  }

  if (Number(thread.owner_user_id) === Number(sessionUser.id)) {
    return { ok: true };
  }

  const member = await db.oneOrNone(
    `SELECT 1 FROM thread_members WHERE thread_id = $1 AND user_id = $2`,
    [threadId, sessionUser.id]
  );

  return { ok: !!member, reason: member ? "ok" : "private" };
}

async function getThreadMembers(db, threadId) {
  return db.any(
    `
    SELECT
      tm.user_id,
      u.username,
      tm.member_role
    FROM thread_members tm
    JOIN users u ON u.id = tm.user_id
    WHERE tm.thread_id = $1
    ORDER BY
      CASE tm.member_role
        WHEN 'moderator' THEN 1
        WHEN 'member' THEN 2
        ELSE 3
      END,
      u.username ASC
    `,
    [threadId]
  );
}

// GET /threads
router.get("/threads", async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit ?? 50), 100);
    const offset = Math.max(Number(req.query.offset ?? 0), 0);

    const db = getDb();
    const sessionUser = req.session.user ?? null;

    let rows;

    if (!sessionUser) {
      rows = await db.any(
        `
        SELECT t.id, t.title, t.created_at AS created,
               u.username AS owner,
               f.name AS forum
        FROM threads t
        JOIN users u ON u.id = t.owner_user_id
        JOIN forums f ON f.id = t.forum_id
        WHERE t.status = 'active' AND f.status='active' AND t.visibility = 'public'
        ORDER BY t.created_at DESC
        LIMIT $1 OFFSET $2
        `,
        [limit, offset]
      );
    } else if (String(sessionUser.role).toLowerCase() === "admin") {
      rows = await db.any(
        `
        SELECT t.id, t.title, t.created_at AS created,
               u.username AS owner,
               f.name AS forum
        FROM threads t
        JOIN users u ON u.id = t.owner_user_id
        JOIN forums f ON f.id = t.forum_id
        WHERE t.status = 'active' AND f.status='active'
        ORDER BY t.created_at DESC
        LIMIT $1 OFFSET $2
        `,
        [limit, offset]
      );
    } else {
      rows = await db.any(
        `
        SELECT DISTINCT t.id, t.title, t.created_at AS created,
               u.username AS owner,
               f.name AS forum
        FROM threads t
        JOIN users u ON u.id = t.owner_user_id
        JOIN forums f ON f.id = t.forum_id
        LEFT JOIN thread_members tm ON tm.thread_id = t.id AND tm.user_id = $1
        WHERE t.status = 'active' AND f.status='active'
          AND (
            t.visibility = 'public'
            OR t.owner_user_id = $1
            OR tm.user_id IS NOT NULL
          )
        ORDER BY t.created_at DESC
        LIMIT $2 OFFSET $3
        `,
        [sessionUser.id, limit, offset]
      );
    }

    return res.json(rows);
  } catch (err) {
    console.error("GET /threads failed:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// POST /threads
// body: { title, description, forum: "Sport", visibility?: "public|private" }
router.post("/threads", requireAuth, async (req, res) => {
  const schema = z.object({
    title: z.string().min(2).max(200),
    description: z.string().max(5000).optional(),
    forum: z.string().min(1).max(80),
    visibility: z.enum(["public", "private"]).optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid thread payload." });
  }

  const { title, description, forum, visibility } = parsed.data;
  const db = getDb();

  const f = await db.oneOrNone(`SELECT id, status FROM forums WHERE name = $1`, [forum]);
  if (!f || f.status !== "active") {
    return res.status(404).json({ message: "Forum not found." });
  }

  const created = await db.one(
    `
    INSERT INTO threads (forum_id, title, description, owner_user_id, visibility)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING id
    `,
    [f.id, title, description ?? null, req.session.user.id, visibility ?? "public"]
  );

  await db.none(
    `
    INSERT INTO thread_members (thread_id, user_id, member_role)
    VALUES ($1, $2, 'moderator')
    ON CONFLICT DO NOTHING
    `,
    [created.id, req.session.user.id]
  );

  return res.status(201).json({
    message: `${title} - has been created in ${forum}.`,
    threadId: created.id
  });
});

// POST /threads/:id/posts
router.post("/threads/:id/posts", requireAuth, async (req, res) => {
  const schema = z.object({
    text: z.string().min(1).max(10000)
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid post payload." });
  }

  const db = getDb();
  const threadId = Number(req.params.id);

  const thread = await db.oneOrNone(
    `SELECT id, visibility, owner_user_id, status FROM threads WHERE id = $1`,
    [threadId]
  );

  if (!thread || String(thread.status).toLowerCase() !== "active") {
    return res.status(404).json({ message: "Thread not found." });
  }

  const sessionUser = req.session.user;
  const role = String(sessionUser?.role ?? "").toLowerCase();
  const isAdmin = role === "admin";
  const isOwner = Number(thread.owner_user_id) === Number(sessionUser.id);

  const member = await db.oneOrNone(
    `SELECT member_role FROM thread_members WHERE thread_id = $1 AND user_id = $2`,
    [threadId, sessionUser.id]
  );

  console.log("POST /threads/:id/posts access debug:", {
    threadId,
    visibility: thread.visibility,
    threadStatus: thread.status,
    ownerUserId: thread.owner_user_id,
    sessionUser: {
      id: sessionUser?.id,
      username: sessionUser?.username,
      role: sessionUser?.role
    },
    isAdmin,
    isOwner,
    isMember: !!member,
    memberRole: member?.member_role ?? null
  });

  if (
    String(thread.visibility).toLowerCase() === "private" &&
    !isAdmin &&
    !isOwner &&
    !member
  ) {
    console.log("POST /threads/:id/posts access denied:", {
      reason: "private_thread_not_member",
      threadId,
      userId: sessionUser?.id
    });
    return res.status(403).json({ message: "Access forbidden" });
  }

  const created = await db.one(
    `INSERT INTO posts (thread_id, author_user_id, text) VALUES ($1, $2, $3) RETURNING id`,
    [threadId, sessionUser.id, parsed.data.text]
  );

  return res.status(201).json({ message: "Post created.", id: created.id });
});

// PATCH /threads/:id
router.patch("/threads/:id", requireAuth, async (req, res) => {
  const schema = z.object({
    newtitle: z.string().min(2).max(200).optional(),
    newdescription: z.string().max(5000).optional(),
    changeCreator: z.string().min(2).max(50).optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid thread update payload." });
  }

  const db = getDb();
  const threadId = Number(req.params.id);

  console.log("PATCH /threads/:id payload debug:", {
    threadId,
    body: req.body,
    parsed: parsed.data,
    sessionUser: req.session.user
  });

  const sessionUser = req.session.user;
  const isAdmin = String(sessionUser.role ?? "").toLowerCase() === "admin";
  const mod = await isModeratorOrOwner(db, threadId, sessionUser.id);

  if (!mod.ok && !isAdmin) {
    return res.status(403).json({ message: "Forbidden." });
  }

  const { newtitle, newdescription, changeCreator } = parsed.data;

  if (newtitle === undefined && newdescription === undefined && !changeCreator) {
    return res.status(400).json({ message: "No changes provided." });
  }

  const updates = [];
  const values = [];
  let i = 1;

  if (newtitle !== undefined) {
    updates.push(`title = $${i++}`);
    values.push(newtitle);
  }

  if (newdescription !== undefined) {
    updates.push(`description = $${i++}`);
    values.push(newdescription);
  }

  if (changeCreator) {
    if (mod.role !== "owner" && !isAdmin) {
      return res.status(403).json({ message: "Only owner/admin can change creator." });
    }

    const u = await db.oneOrNone(
      `SELECT id FROM users WHERE username = $1 AND status='active'`,
      [changeCreator]
    );

    if (!u) {
      return res.status(404).json({ message: "New owner not found." });
    }

    updates.push(`owner_user_id = $${i++}`);
    values.push(u.id);

    await db.none(
      `INSERT INTO thread_members (thread_id, user_id, member_role)
       VALUES ($1, $2, 'moderator')
       ON CONFLICT DO NOTHING`,
      [threadId, u.id]
    );
  }

  updates.push(`updated_at = now()`);

  values.push(threadId);

  await db.none(
    `UPDATE threads SET ${updates.join(", ")} WHERE id = $${i}`,
    values
  );

  return res.json({ message: "Thread updated." });
});

// PATCH /threads (compat)
router.patch("/threads", requireAuth, async (req, res) => {
  if (!("threadId" in req.body)) {
    return res.status(400).json({ message: "Missing threadId." });
  }
  req.params.id = String(req.body.threadId);
  return router.handle(req, res, () => {});
});

// PATCH /threads/:id/visibility
router.patch("/threads/:id/visibility", requireAuth, async (req, res) => {
  try {
    const schema = z.object({
      visibility: z.enum(["public", "private"])
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid visibility payload." });
    }

    const db = getDb();
    const threadId = Number(req.params.id);

    console.log("PATCH /threads/:id/visibility payload debug:", {
      threadId,
      body: req.body,
      parsed: parsed.data,
      sessionUser: req.session.user
    });

    const sessionUser = req.session.user;
    const isAdmin = String(sessionUser.role ?? "").toLowerCase() === "admin";
    const mod = await isModeratorOrOwner(db, threadId, sessionUser.id);

    if (!isAdmin && !mod.ok) {
      return res.status(403).json({ message: "Forbidden." });
    }

    await db.none(
      `UPDATE threads SET visibility = $1, updated_at = now() WHERE id = $2`,
      [parsed.data.visibility, threadId]
    );

    await audit(req, {
      action: "thread.visibility",
      targetType: "thread",
      targetId: threadId,
      metadata: { visibility: parsed.data.visibility }
    });

    return res.json({ message: "Visibility updated." });
  } catch (err) {
    console.error("PATCH /threads/:id/visibility failed:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// POST /threads/:id/moderators
router.post("/threads/:id/moderators", requireAuth, async (req, res) => {
  const schema = z.object({ userId: z.number().int().positive() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid payload." });
  }

  const db = getDb();
  const threadId = Number(req.params.id);

  const sessionUser = req.session.user;
  const isAdmin = String(sessionUser.role).toLowerCase() === "admin";
  const mod = await isModeratorOrOwner(db, threadId, sessionUser.id);

  if (mod.role !== "owner" && !isAdmin) {
    return res.status(403).json({ message: "Only owner/admin can assign moderators." });
  }

  await db.none(
    `
    INSERT INTO thread_members (thread_id, user_id, member_role)
    VALUES ($1, $2, 'moderator')
    ON CONFLICT (thread_id, user_id) DO UPDATE SET member_role = 'moderator'
    `,
    [threadId, parsed.data.userId]
  );

  return res.status(201).json({ message: "Moderator assigned." });
});

// DELETE /threads/:id/moderators/:userId
router.delete("/threads/:id/moderators/:userId", requireAuth, async (req, res) => {
  const db = getDb();
  const threadId = Number(req.params.id);
  const userId = Number(req.params.userId);

  const sessionUser = req.session.user;
  const isAdmin = String(sessionUser.role).toLowerCase() === "admin";
  const mod = await isModeratorOrOwner(db, threadId, sessionUser.id);

  if (mod.role !== "owner" && !isAdmin) {
    return res.status(403).json({ message: "Only owner/admin can revoke moderators." });
  }

  await db.none(
    `
    UPDATE thread_members
    SET member_role = 'member'
    WHERE thread_id = $1 AND user_id = $2
    `,
    [threadId, userId]
  );

  return res.json({ message: "Moderator revoked." });
});

// POST /threads/:id/members
router.post("/threads/:id/members", requireAuth, async (req, res) => {
  const schema = z.object({ userId: z.number().int().positive() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid payload." });
  }

  const db = getDb();
  const threadId = Number(req.params.id);
  const sessionUser = req.session.user;

  const isAdmin = String(sessionUser.role).toLowerCase() === "admin";
  const mod = await isModeratorOrOwner(db, threadId, sessionUser.id);

  if (!isAdmin && !mod.ok) {
    return res.status(403).json({ message: "Forbidden." });
  }

  await db.none(
    `
    INSERT INTO thread_members (thread_id, user_id, member_role)
    VALUES ($1, $2, 'member')
    ON CONFLICT DO NOTHING
    `,
    [threadId, parsed.data.userId]
  );

  return res.status(201).json({ message: "User added to thread." });
});

// DELETE /threads/:id/members/:userId
router.delete("/threads/:id/members/:userId", requireAuth, async (req, res) => {
  const db = getDb();
  const threadId = Number(req.params.id);
  const userId = Number(req.params.userId);

  const sessionUser = req.session.user;
  const isAdmin = String(sessionUser.role).toLowerCase() === "admin";
  const mod = await isModeratorOrOwner(db, threadId, sessionUser.id);

  if (!isAdmin && !mod.ok) {
    return res.status(403).json({ message: "Forbidden." });
  }

  await db.none(
    `DELETE FROM thread_members WHERE thread_id = $1 AND user_id = $2`,
    [threadId, userId]
  );

  return res.json({ message: "User removed from thread." });
});

// GET /threads/by-title/:title
router.get("/threads/by-title/:title", async (req, res) => {
  try {
    const db = getDb();
    const title = req.params.title;

    const thread = await db.oneOrNone(
      `
      SELECT t.id,
             t.title,
             t.owner_user_id AS owner_id,
             t.created_at AS created,
             t.forum_id,
             t.description,
             t.visibility,
             t.status
      FROM threads t
      WHERE t.title = $1
      LIMIT 1
      `,
      [title]
    );

    console.log("GET /threads/by-title raw thread:", {
      title,
      sessionUser: req.session.user ?? null,
      thread
    });

    if (!thread || String(thread.status).toLowerCase() !== "active") {
      return res.status(404).json({ message: "Thread not found." });
    }

    const sessionUser = req.session.user ?? null;
    const access = await canReadThread(db, thread.id, sessionUser);

    console.log("GET /threads/by-title access result:", {
      title,
      threadId: thread.id,
      sessionUser,
      access
    });

    if (!access.ok) {
      return res.status(403).json({ message: "Access forbidden" });
    }

    let isModerator = false;
    if (sessionUser) {
      const modRow = await db.oneOrNone(
        `SELECT 1 FROM thread_members WHERE thread_id = $1 AND user_id = $2 AND member_role = 'moderator'`,
        [thread.id, sessionUser.id]
      );
      isModerator = !!modRow;
    }

    console.log("GET /threads/by-title moderator debug:", {
      threadId: thread.id,
      sessionUser,
      isModerator
    });

    const messages = await db.any(
      `
      SELECT p.id,
             p.text,
             u.username AS "user",
             to_char(p.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS "date",
             to_char(p.created_at AT TIME ZONE 'UTC', 'HH24:MI:SS') AS "time"
      FROM posts p
      JOIN users u ON u.id = p.author_user_id
      WHERE p.thread_id = $1 AND p.status = 'active'
      ORDER BY p.created_at ASC
      `,
      [thread.id]
    );

    const members = await getThreadMembers(db, thread.id);

    console.log("GET /threads/by-title response debug:", {
      threadId: thread.id,
      visibility: thread.visibility,
      messageCount: messages.length,
      memberCount: members.length
    });

    const { status, ...threadOut } = thread;

    return res.json({
      thread: threadOut,
      messages,
      members,
      isModerator
    });
  } catch (err) {
    console.error("GET /threads/by-title failed:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// GET /threads/by-id/:id
router.get("/threads/by-id/:id", async (req, res) => {
  try {
    const db = getDb();

    const threadId = Number(req.params.id);
    if (!Number.isFinite(threadId) || threadId <= 0) {
      return res.status(400).json({ message: "Invalid thread id." });
    }

    const thread = await db.oneOrNone(
      `
      SELECT t.id,
             t.title,
             t.owner_user_id AS owner_id,
             t.created_at AS created,
             t.forum_id,
             t.description,
             t.visibility,
             t.status
      FROM threads t
      WHERE t.id = $1
      LIMIT 1
      `,
      [threadId]
    );

    console.log("GET /threads/by-id raw thread:", {
      threadId,
      sessionUser: req.session.user ?? null,
      thread
    });

    if (!thread || String(thread.status).toLowerCase() !== "active") {
      return res.status(404).json({ message: "Thread not found." });
    }

    const sessionUser = req.session.user ?? null;

    console.log("GET /threads/by-id access debug:", {
      threadId,
      sessionUser,
      threadVisibility: thread?.visibility,
      threadOwner: thread?.owner_id,
      threadStatus: thread?.status
    });

    const access = await canReadThread(db, thread.id, sessionUser);

    console.log("GET /threads/by-id access result:", {
      threadId,
      access
    });

    if (!access.ok) {
      return res.status(403).json({ message: "Access forbidden" });
    }

    let isModerator = false;
    if (sessionUser) {
      const modRow = await db.oneOrNone(
        `SELECT 1 FROM thread_members WHERE thread_id = $1 AND user_id = $2 AND member_role = 'moderator'`,
        [thread.id, sessionUser.id]
      );
      isModerator = !!modRow;
    }

    console.log("GET /threads/by-id moderator debug:", {
      threadId,
      sessionUser,
      isModerator
    });

    const messages = await db.any(
      `
      SELECT p.id,
             p.text,
             u.username AS "user",
             to_char(p.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS "date",
             to_char(p.created_at AT TIME ZONE 'UTC', 'HH24:MI:SS') AS "time"
      FROM posts p
      JOIN users u ON u.id = p.author_user_id
      WHERE p.thread_id = $1 AND p.status = 'active'
      ORDER BY p.created_at ASC
      `,
      [thread.id]
    );

    const members = await getThreadMembers(db, thread.id);

    console.log("GET /threads/by-id response debug:", {
      threadId,
      visibility: thread.visibility,
      messageCount: messages.length,
      memberCount: members.length
    });

    const { status, ...threadOut } = thread;

    return res.json({
      thread: threadOut,
      messages,
      members,
      isModerator
    });
  } catch (err) {
    console.error("GET /threads/by-id failed:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// GET /thread/:idOrTitle
router.get("/thread/:idOrTitle", async (req, res) => {
  try {
    const db = getDb();
    const raw = req.params.idOrTitle;

    const asId = Number(raw);
    let thread;

    if (Number.isFinite(asId) && String(asId) === raw && asId > 0) {
      thread = await db.oneOrNone(
        `
        SELECT t.id,
               t.title,
               t.owner_user_id AS owner_id,
               t.created_at AS created,
               t.forum_id,
               t.description,
               t.visibility,
               t.status
        FROM threads t
        WHERE t.id = $1
        LIMIT 1
        `,
        [asId]
      );
    } else {
      thread = await db.oneOrNone(
        `
        SELECT t.id,
               t.title,
               t.owner_user_id AS owner_id,
               t.created_at AS created,
               t.forum_id,
               t.description,
               t.visibility,
               t.status
        FROM threads t
        WHERE t.title = $1
        LIMIT 1
        `,
        [raw]
      );
    }

    if (!thread || String(thread.status).toLowerCase() !== "active") {
      return res.status(404).json({ message: "Thread not found." });
    }

    const sessionUser = req.session.user ?? null;
    const access = await canReadThread(db, thread.id, sessionUser);
    if (!access.ok) {
      return res.status(403).json({ message: "Access forbidden" });
    }

    let isModerator = false;
    if (sessionUser) {
      const modRow = await db.oneOrNone(
        `SELECT 1 FROM thread_members WHERE thread_id = $1 AND user_id = $2 AND member_role = 'moderator'`,
        [thread.id, sessionUser.id]
      );
      isModerator = !!modRow;
    }

    const messages = await db.any(
      `
      SELECT p.id,
             p.text,
             u.username AS "user",
             to_char(p.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS "date",
             to_char(p.created_at AT TIME ZONE 'UTC', 'HH24:MI:SS') AS "time"
      FROM posts p
      JOIN users u ON u.id = p.author_user_id
      WHERE p.thread_id = $1 AND p.status = 'active'
      ORDER BY p.created_at ASC
      `,
      [thread.id]
    );

    const members = await getThreadMembers(db, thread.id);

    const { status, ...threadOut } = thread;
    return res.json({ thread: threadOut, messages, members, isModerator });
  } catch (err) {
    console.error("GET /thread/:idOrTitle failed:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
});

router.delete("/:forum/:thread", requireAuth, async (req, res, next) => {
  if (req.params.forum === "posts") return next();

  const db = getDb();
  const forumSlug = req.params.forum;
  const threadTitle = req.params.thread;

  const t = await db.oneOrNone(
    `
    SELECT t.id, t.owner_user_id
    FROM threads t
    JOIN forums f ON f.id = t.forum_id
    WHERE t.status='active' AND f.slug = $1 AND t.title = $2
    LIMIT 1
    `,
    [forumSlug, threadTitle]
  );
  if (!t) return res.status(404).json({ message: "Thread not found." });

  const sessionUser = req.session.user;
  if (String(sessionUser.role).toLowerCase() !== "admin" && String(sessionUser.id) !== String(t.owner_user_id)) {
    return res.status(403).json({ message: "Forbidden." });
  }

  await db.none(
    `UPDATE threads SET status = 'deleted', updated_at = now() WHERE id = $1`,
    [t.id]
  );

  return res.json({ message: "Thread deleted." });
});

// PATCH /threads/:id/block
router.patch("/threads/:id/block", requireAuth, async (req, res) => {
  if (String(req.session.user.role).toLowerCase() !== "admin") {
    return res.status(403).json({ message: "Forbidden." });
  }

  const db = getDb();
  const threadId = Number(req.params.id);

  const exists = await db.oneOrNone(`SELECT 1 FROM threads WHERE id = $1`, [threadId]);
  if (!exists) return res.status(404).json({ message: "Thread not found." });

  await db.none(
    `UPDATE threads SET status='blocked', updated_at = now() WHERE id = $1`,
    [threadId]
  );

  await audit(req, {
    action: "thread.block",
    targetType: "thread",
    targetId: threadId
  });

  return res.json({ message: "Thread blocked." });
});

// PATCH /threads/:id/restore
router.patch("/threads/:id/restore", requireAuth, async (req, res) => {
  if (String(req.session.user.role).toLowerCase() !== "admin") {
    return res.status(403).json({ message: "Forbidden." });
  }

  const db = getDb();
  const threadId = Number(req.params.id);

  const exists = await db.oneOrNone(`SELECT 1 FROM threads WHERE id = $1`, [threadId]);
  if (!exists) return res.status(404).json({ message: "Thread not found." });

  await db.none(
    `UPDATE threads SET status='active', updated_at = now() WHERE id = $1`,
    [threadId]
  );

  await audit(req, {
    action: "thread.restore",
    targetType: "thread",
    targetId: threadId
  });

  return res.json({ message: "Thread restored." });
});

// POST /forums/:id/threads
router.post("/forums/:id/threads", requireAuth, async (req, res) => {
  const paramsSchema = z.object({
    id: z.coerce.number().int().positive(),
  });

  const bodySchema = z.object({
    title: z.string().min(2).max(200),
    description: z.string().max(5000).optional(),
    visibility: z.enum(["public", "private"]).optional(),
  });

  const p = paramsSchema.safeParse(req.params);
  if (!p.success) return res.status(400).json({ message: "Invalid forum id." });

  const b = bodySchema.safeParse(req.body);
  if (!b.success) return res.status(400).json({ message: "Invalid thread payload." });

  const forumId = p.data.id;
  const { title, description, visibility } = b.data;

  try {
    const db = getDb();

    const f = await db.oneOrNone(`SELECT id, status FROM forums WHERE id = $1`, [forumId]);
    if (!f || f.status !== "active") return res.status(404).json({ message: "Forum not found." });

    const created = await db.one(
      `
      INSERT INTO threads (forum_id, title, description, owner_user_id, visibility)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id
      `,
      [f.id, title, description ?? null, req.session.user.id, visibility ?? "public"]
    );

    await db.none(
      `
      INSERT INTO thread_members (thread_id, user_id, member_role)
      VALUES ($1, $2, 'moderator')
      ON CONFLICT DO NOTHING
      `,
      [created.id, req.session.user.id]
    );

    return res.status(201).json({ id: created.id });
  } catch (err) {
    console.error("POST /forums/:id/threads failed:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
});

export default router;