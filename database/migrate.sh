#!/usr/bin/env bash
set -euo pipefail

# Runs all SQL migrations in database/migrations in filename order.
# Requires: psql (local) OR run from a machine that has psql available.

DB_URL=${DATABASE_URL:-"postgres://blug_app:blug_app_password@localhost:5432/blug"}

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
MIG_DIR="$SCRIPT_DIR/migrations"

if [ ! -d "$MIG_DIR" ]; then
  echo "No migrations directory found at $MIG_DIR"
  exit 1
fi

echo "Using DATABASE_URL=$DB_URL"

echo "Applying migrations in $MIG_DIR ..."
for f in $(ls -1 "$MIG_DIR"/*.sql 2>/dev/null | sort); do
  echo "-> $f"
  psql "$DB_URL" -v ON_ERROR_STOP=1 -f "$f"
done

echo "Done."
