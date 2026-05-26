#!/bin/sh
# Convenience wrapper: run Alembic against a running postgres container.
# Usage: ./scripts/migrate.sh [alembic-args]
#   ./scripts/migrate.sh upgrade head
#   ./scripts/migrate.sh revision --autogenerate -m "add column"
#   ./scripts/migrate.sh downgrade -1
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR/../backend"

cd "$BACKEND_DIR"

# Use the docker-compose postgres port (5433) by default
export ALEMBIC_DATABASE_URL="${ALEMBIC_DATABASE_URL:-postgresql://user:pass@localhost:5433/codesage}"

echo "[migrate] Running: alembic $*"
alembic "$@"
