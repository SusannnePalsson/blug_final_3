# Blug Backend Starter (Express + PostgreSQL + Sessions)

This starter matches your Blug endpoints for **/login** and **/users**, with:
- PostgreSQL via **pg-promise**
- Session auth via **express-session**
- Rate limiting (global + auth) using **express-rate-limit**
- Basic ACL middleware with role gates
- Zod validation + Argon2 password hashing

## Requirements
- Node.js 18+ (recommended)
- PostgreSQL 14+ (works with 17)
- psql or pgAdmin

## 1) Database setup
1. Create database (example):
   - Run `Blug.Database/create_database.sql` as `postgres`
2. Run migration:
   - Run `Blug.Database/migrations/001_init.sql` on database `blug`

## 2) API setup
1. Copy `.env.template` to `.env` and fill DB creds.
2. Install deps:
   - `npm install`
3. Start dev:
   - `npm run dev`
4. API runs at:
   - `http://localhost:3000`

## 3) Postman
Import the collection:
- `Postman/Blug.postman_collection.json`

Set the variable:
- `baseUrl` = `http://localhost:3000`

Postman will keep cookies automatically so sessions work across requests.

## Notes
- In production, use HTTPS and set `NODE_ENV=production` so cookies become `secure`.
- For clustered / multi-instance deployments, use a persistent session store (e.g. Postgres via connect-pg-simple).


## Added endpoints
This starter now includes `/forums` and `/threads` with basic private thread + moderator membership support.

- `/posts` create/edit/delete messages (ownership + moderation delete)


## Moderation/admin
- Moderators/owners/admin can **block** posts: `PATCH /posts/:id/block`
- Admin can **restore** posts: `PATCH /posts/:id/restore`
- Admin can block/restore threads: `PATCH /threads/:id/block`, `PATCH /threads/:id/restore`
- Alias create post: `POST /threads/:id/posts`


## Admin seed (required by spec)
1) Generate an Argon2 hash:
   - `node scripts/generate-argon2-hash.mjs "YourStrongPassword"`

2) Paste the hash into:
   - `Blug.Database/migrations/003_seed_admin.sql` (replace `<ARGON2_HASH_HERE>`)

3) Run seed:
   - `psql -U postgres -d blug -f Blug.Database/migrations/003_seed_admin.sql`

## One-shot DB setup (Windows)
Use the provided PowerShell script (runs create_database.sql + 001_init.sql + 003_seed_admin.sql):
- `setup\setup.ps1` (or `setup\setup.bat`)

You may need to set your PostgreSQL bin path:
- `-PgBin "C:\Program Files\PostgreSQL\17\bin"`


## Admin seed (automatic, no SQL editing)
Instead of pasting an argon2 hash into SQL, run:

- `node scripts/seed-admin.mjs --username admin --email admin@blug.local --password "YourStrongPassword"`

It will:
- create the user if missing
- assign the `admin` role (idempotent)

Make sure DB env vars are set (DB_HOST/DB_PORT/DB_NAME/DB_USER/DB_PASSWORD).


## Admin seed (prompt, no echo)
To avoid putting the password in your terminal history, run:

- `node scripts/seed-admin-prompt.mjs --username admin --email admin@blug.local`

You'll be prompted for the password (hidden input).


### Windows setup with interactive admin seed
Run setup and be prompted securely for admin password:

```powershell
.\setup\setup.ps1 -PgBin "C:\Program Files\PostgreSQLin" -SeedAdminPrompt
```


## CSRF protection
This API uses session cookies. For state-changing requests (POST/PATCH/DELETE), send header `X-CSRF-Token`.
Fetch it with `GET /csrf-token` after login.


## Audit logging
Sensitive moderation/admin actions are recorded in `audit_log` (see migration 004_audit_log.sql).


## Pagination
List endpoints support `?limit` (max 100) and `?offset`.


## Windows ARM64 note
On Windows ARM64 (and newer Node versions), native `argon2` may fail to install. This project uses `@node-rs/argon2` to avoid build-tool issues.
