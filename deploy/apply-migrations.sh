#!/usr/bin/env sh

# Apply repository migrations exactly once to a fresh self-hosted Supabase
# database. Applied filenames are recorded in a deployment-only schema so
# rerunning this command is safe after an interrupted deployment.

set -eu

APP_DIR=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
SUPABASE_DIR=${SUPABASE_DIR:-/opt/buirpoint/supabase-project}
MIGRATIONS_DIR="$APP_DIR/supabase/migrations"

compose() {
  docker compose \
    --project-directory "$SUPABASE_DIR" \
    -f "$SUPABASE_DIR/docker-compose.yml" \
    -f "$SUPABASE_DIR/docker-compose.production.yml" \
    "$@"
}

if [ ! -d "$MIGRATIONS_DIR" ]; then
  echo "Migration directory not found: $MIGRATIONS_DIR" >&2
  exit 1
fi

compose exec -T db psql -v ON_ERROR_STOP=1 -U postgres -d postgres <<'SQL'
create schema if not exists deployment;
revoke all on schema deployment from public;

create table if not exists deployment.applied_migrations (
  version text primary key,
  applied_at timestamptz not null default now()
);

revoke all on all tables in schema deployment from public;
SQL

for migration in "$MIGRATIONS_DIR"/*.sql; do
  [ -f "$migration" ] || continue
  version=$(basename "$migration")
  case "$version" in
    [0-9][0-9][0-9][0-9]_*.sql) ;;
    *)
      echo "Unexpected migration filename: $version" >&2
      exit 1
      ;;
  esac

  # Filenames are constrained above to the repository migration convention,
  # so inserting them as SQL string literals is safe and works consistently
  # with psql's non-interactive -c mode.
  applied=$(compose exec -T db psql -qtAX -U postgres -d postgres \
    -c "select exists(select 1 from deployment.applied_migrations where version = '$version');")

  if [ "$applied" = "t" ]; then
    echo "Already applied: $version"
    continue
  fi

  echo "Applying: $version"
  compose exec -T db psql -v ON_ERROR_STOP=1 -U postgres -d postgres < "$migration"
  compose exec -T db psql -v ON_ERROR_STOP=1 -U postgres -d postgres \
    -c "insert into deployment.applied_migrations (version) values ('$version');"
done

echo "All migrations are applied."
