import { getDb } from "../config/db.js";

/**
 * Simple audit logger for sensitive actions (moderation/admin).
 * Best-effort: failures should not crash request flow.
 */
export async function audit(req, { action, targetType, targetId = null, metadata = {} }) {
  try {
    const user = req.session?.user;
    const actorUserId = user?.id ?? null;
    const actorRole = user?.role ?? "anonymous";

    const db = getDb();
    await db.none(
      `
      INSERT INTO audit_log (actor_user_id, actor_role, action, target_type, target_id, metadata, ip, user_agent)
      VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8)
      `,
      [
        actorUserId,
        actorRole,
        action,
        targetType,
        targetId,
        JSON.stringify(metadata ?? {}),
        req.ip ?? null,
        req.get("user-agent") ?? null,
      ]
    );
  } catch (_) {
    // swallow
  }
}
