-- 001_init.sql (idempotent)
-- Core schema for Blug Forum (PostgreSQL)
-- Safe to run multiple times.

BEGIN;

-- Extensions
CREATE EXTENSION IF NOT EXISTS citext;

-- USERS
CREATE TABLE IF NOT EXISTS users (
  id            BIGSERIAL PRIMARY KEY,
  username      CITEXT NOT NULL UNIQUE,
  email         CITEXT NOT NULL UNIQUE,
  password_hash TEXT   NOT NULL,
  status        TEXT   NOT NULL DEFAULT 'active', -- active | blocked | deleted
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ROLES
CREATE TABLE IF NOT EXISTS roles (
  id   BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE
);

-- Ensure base roles exist (idempotent)
INSERT INTO roles(name) VALUES ('member')
ON CONFLICT (name) DO NOTHING;

INSERT INTO roles(name) VALUES ('admin')
ON CONFLICT (name) DO NOTHING;

-- USER_ROLES (M:N)
CREATE TABLE IF NOT EXISTS user_roles (
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id BIGINT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, role_id)
);

-- FORUMS
CREATE TABLE IF NOT EXISTS forums (
  id          BIGSERIAL PRIMARY KEY,
  name        TEXT NOT NULL UNIQUE,
  slug        TEXT NOT NULL UNIQUE,
  description TEXT,
  created_by  BIGINT REFERENCES users(id) ON DELETE SET NULL,
  status      TEXT NOT NULL DEFAULT 'active', -- active | blocked | deleted
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- THREADS
CREATE TABLE IF NOT EXISTS threads (
  id            BIGSERIAL PRIMARY KEY,
  title         TEXT NOT NULL,
  description   TEXT,
  forum_id      BIGINT NOT NULL REFERENCES forums(id) ON DELETE CASCADE,
  owner_user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  visibility    TEXT NOT NULL DEFAULT 'public', -- public | private
  status        TEXT NOT NULL DEFAULT 'active', -- active | blocked | deleted
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- POSTS (messages)
CREATE TABLE IF NOT EXISTS posts (
  id             BIGSERIAL PRIMARY KEY,
  thread_id      BIGINT NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
  author_user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  text           TEXT NOT NULL,
  status         TEXT NOT NULL DEFAULT 'active', -- active | blocked | deleted
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- THREAD_MEMBERS (private threads + moderators)
CREATE TABLE IF NOT EXISTS thread_members (
  thread_id   BIGINT NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
  user_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  member_role TEXT   NOT NULL DEFAULT 'member', -- member | moderator
  status      TEXT   NOT NULL DEFAULT 'active', -- active | removed
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (thread_id, user_id)
);

-- SESSION (for connect-pg-simple style sessions)
-- IMPORTANT: we drop/recreate ONLY if it exists in a broken shape.
-- We'll create it IF NOT EXISTS with the correct PK.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'session'
  ) THEN
    -- If the table exists but does not have a PRIMARY KEY on 'sid', fix it.
    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint c
      JOIN pg_class t ON c.conrelid = t.oid
      WHERE t.relname = 'session'
        AND c.contype = 'p'
    ) THEN
      -- no PK -> ensure correct structure by recreating
      EXECUTE 'DROP TABLE public.session';
    END IF;
  END IF;

  -- Create correct session table if missing
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'session'
  ) THEN
    EXECUTE '
      CREATE TABLE public.session (
        sid    varchar PRIMARY KEY,
        sess   json NOT NULL,
        expire timestamptz NOT NULL
      )';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_session_expire ON public.session(expire)';
  END IF;
END $$;

-- Helpful indexes (safe)
CREATE INDEX IF NOT EXISTS idx_threads_forum_created ON threads(forum_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_thread_created  ON posts(thread_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_posts_author_created  ON posts(author_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_thread_members_user   ON thread_members(user_id);

COMMIT;
