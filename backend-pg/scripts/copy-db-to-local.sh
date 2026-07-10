#!/usr/bin/env bash
#
# copy-db-to-local.sh
# --------------------
# Copies the shared ai-theme-generator Postgres database (trooaithemes_db on
# 192.168.0.10) down to the local, isolated Postgres started by
# `docker compose up -d postgres` (docker-compose.yml in this directory,
# host port 5433). This lets you develop/test against real data without ever
# writing to the shared server.
#
# Both databases are treated as read-only targets by this script: the source
# is only ever dumped, never written to, and if the local target already has
# tables the script aborts instead of dropping/overwriting anything. It only
# populates a genuinely empty target.
#
# The dump contains real user data (emails, password hashes). It is written
# to a temp file outside the repo and deleted when the script finishes, it
# is never committed.
#
# USAGE:
#   ./scripts/copy-db-to-local.sh
#
# ENV OVERRIDES:
#   SOURCE_DATABASE_URL   defaults to the shared trooaithemes_db
#   LOCAL_DATABASE_URL    defaults to the local docker-compose Postgres

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

SOURCE_DATABASE_URL="${SOURCE_DATABASE_URL:-postgresql://trooaithemes:trooaithemes789@192.168.0.10:5432/trooaithemes_db}"
LOCAL_DATABASE_URL="${LOCAL_DATABASE_URL:-postgresql://trooai:trooai@localhost:5433/trooai}"

mask() { echo "$1" | sed -E 's#//[^:]+:[^@]+@#//***:***@#'; }

echo "==> Source: $(mask "$SOURCE_DATABASE_URL")"
echo "==> Target: $(mask "$LOCAL_DATABASE_URL")"

command -v docker >/dev/null 2>&1 || { echo "ERROR: 'docker' is required but not found." >&2; exit 1; }

# pg_dump must be >= the source server's version. Rather than depend on a
# matching client being installed on the host, run pg_dump/psql inside a
# postgres:18-alpine container (matches the shared server's version 18).
PG_CLIENT_IMAGE="postgres:18-alpine"

echo "==> Ensuring local Postgres container is running..."
cd "$REPO_ROOT"
docker compose up -d postgres

echo "==> Waiting for local Postgres to accept connections..."
for i in $(seq 1 15); do
  docker compose exec -T postgres pg_isready -U trooai -d trooai >/dev/null 2>&1 && break
  sleep 1
done

echo "==> Checking whether the local target is empty..."
EXISTING_TABLES="$(docker run --rm --network host "$PG_CLIENT_IMAGE" \
  psql "$LOCAL_DATABASE_URL" -tAc "SELECT count(*) FROM information_schema.tables WHERE table_schema='public';")"

if [[ "${EXISTING_TABLES// /}" != "0" ]]; then
  echo "ERROR: local target already has $EXISTING_TABLES table(s) in schema 'public'." >&2
  echo "       Refusing to overwrite it. Drop it yourself first if you want a fresh copy, e.g.:" >&2
  echo "       docker compose down -v && docker compose up -d postgres" >&2
  exit 1
fi

DUMP_FILE="$(mktemp /tmp/trooaithemes_dump.XXXXXX.sql)"
trap 'rm -f "$DUMP_FILE"' EXIT

echo "==> Dumping source database (schema + data, read-only against the source)..."
docker run --rm --network host "$PG_CLIENT_IMAGE" \
  pg_dump "$SOURCE_DATABASE_URL" --no-owner --no-privileges > "$DUMP_FILE"

echo "==> Restoring into local (empty) database..."
docker run --rm -i --network host "$PG_CLIENT_IMAGE" \
  psql "$LOCAL_DATABASE_URL" -v ON_ERROR_STOP=1 < "$DUMP_FILE" >/dev/null

echo ""
echo "==> Done. Local database now mirrors the shared source."
echo "    Point DATABASE_URL at: $(mask "$LOCAL_DATABASE_URL")"
