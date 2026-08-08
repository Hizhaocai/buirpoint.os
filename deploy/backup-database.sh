#!/usr/bin/env sh

# Create a compressed PostgreSQL backup from the self-hosted Supabase database.
# Keep the backup directory on a separate mounted disk or off-server sync target
# once one is available.

set -eu

SUPABASE_DIR=${SUPABASE_DIR:-/opt/buirpoint/supabase-project}
BACKUP_DIR=${BACKUP_DIR:-/opt/buirpoint/backups/postgres}
RETENTION_DAYS=${RETENTION_DAYS:-14}

mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"

timestamp=$(date -u +%Y%m%dT%H%M%SZ)
backup_file="$BACKUP_DIR/buirpoint-postgres-$timestamp.sql.gz"

docker compose \
  --project-directory "$SUPABASE_DIR" \
  -f "$SUPABASE_DIR/docker-compose.yml" \
  -f "$SUPABASE_DIR/docker-compose.production.yml" \
  exec -T db sh -c 'PGPASSWORD="$POSTGRES_PASSWORD" pg_dump -U postgres postgres' \
  | gzip -9 > "$backup_file"

chmod 600 "$backup_file"
find "$BACKUP_DIR" -type f -name 'buirpoint-postgres-*.sql.gz' -mtime "+$RETENTION_DAYS" -delete

echo "Created $backup_file"
