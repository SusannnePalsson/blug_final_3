-- 003_seed_admin.sql
-- Create an admin user directly in the database (as required).
-- IMPORTANT: Replace <ARGON2_HASH_HERE> with a real argon2id hash.
-- You can generate one using the provided script:
--   node scripts/generate-argon2-hash.mjs "YourStrongPassword"
--
-- Then paste the output hash below.

BEGIN;

-- 1) Create the user (idempotent-ish)
INSERT INTO users (username, email, password_hash, status)
VALUES ('admin', 'admin@blug.local', '<ARGON2_HASH_HERE>', 'active')
ON CONFLICT (username) DO NOTHING;

-- 2) Ensure admin role is assigned
INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id
FROM users u
JOIN roles r ON r.name = 'admin'
WHERE u.username = 'admin'
ON CONFLICT DO NOTHING;

COMMIT;
