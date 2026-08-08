# Buir Point Studio OS：生产部署

本项目以自托管 Supabase 为后端，Next.js 为应用，Caddy 为唯一公网入口。

```text
Internet
  ├─ https://os.buirpoint.top   -> Caddy -> 127.0.0.1:3100 (Next.js)
  └─ https://api.buirpoint.top  -> Caddy -> 127.0.0.1:8000 (Supabase Kong)

Supabase Studio / PostgreSQL pooler: not exposed publicly
```

## Server layout

```text
/opt/buirpoint/
  app/                 # this repository, excluding local .env files
  supabase-project/    # official Supabase Docker release
  proxy/               # Caddyfile and caddy-compose.yml
  backups/postgres/    # encrypted/off-server sync recommended
```

## Pre-flight

1. Cloud security group and UFW permit only TCP 22, 80 and 443.
2. `os.buirpoint.top` and `api.buirpoint.top` resolve to this server.
3. The Supabase release is configured in `/opt/buirpoint/supabase-project/.env`.
4. Never copy `.env.local`, `.env.remote.local`, Supabase `.env`, or backups into source control.

Disable public sign-up before starting Auth. Accounts are created by an owner
through Studio, not by the public registration API:

Keep `ENABLE_EMAIL_SIGNUP=true`: it enables password authentication. The
`DISABLE_SIGNUP` setting above is what blocks self-service account creation.

```bash
sed -i \
  -e 's/^DISABLE_SIGNUP=.*/DISABLE_SIGNUP=true/' \
  -e 's/^ENABLE_EMAIL_SIGNUP=.*/ENABLE_EMAIL_SIGNUP=true/' \
  /opt/buirpoint/supabase-project/.env
```

## Configure private Supabase ports

Copy `deploy/supabase.production.yml` to:

```bash
cp /opt/buirpoint/app/deploy/supabase.production.yml \
  /opt/buirpoint/supabase-project/docker-compose.production.yml
```

Validate and start Supabase:

```bash
cd /opt/buirpoint/supabase-project
docker compose -f docker-compose.yml -f docker-compose.production.yml config --quiet
docker compose -f docker-compose.yml -f docker-compose.production.yml up -d
docker compose -f docker-compose.yml -f docker-compose.production.yml ps
```

## Apply application migrations

Only after the Supabase stack reports healthy, but before publishing the app:

```bash
cd /opt/buirpoint/app
chmod 700 deploy/apply-migrations.sh deploy/backup-database.sh
SUPABASE_DIR=/opt/buirpoint/supabase-project ./deploy/apply-migrations.sh
```

The deployment-only `deployment.applied_migrations` table records completed migration files and makes a later rerun safe.

## Configure the application

Create `/opt/buirpoint/app/deploy/app.env` with permissions `600`:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://api.buirpoint.top
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<value of SUPABASE_PUBLISHABLE_KEY in Supabase .env>
```

Build and start the app:

```bash
cd /opt/buirpoint/app
docker compose --env-file deploy/app.env -f docker-compose.production.yml up -d --build
docker compose -f docker-compose.production.yml ps
```

## Configure Caddy and HTTPS

```bash
mkdir -p /opt/buirpoint/proxy
cp /opt/buirpoint/app/deploy/Caddyfile /opt/buirpoint/proxy/
cp /opt/buirpoint/app/deploy/caddy-compose.yml /opt/buirpoint/proxy/
cd /opt/buirpoint/proxy
docker compose -f caddy-compose.yml up -d
docker compose -f caddy-compose.yml logs --tail=100 caddy
```

Caddy requests and renews certificates automatically after DNS and ports 80/443 are reachable.

## Backup

Manual backup:

```bash
SUPABASE_DIR=/opt/buirpoint/supabase-project ./deploy/backup-database.sh
```

Set a daily cron job after confirming a successful restore procedure. Backups should be synchronized to storage outside this server; a disk failure destroys local backups together with the database.

## Studio access over SSH

Keep Studio off the public Internet. From a trusted local computer:

```powershell
ssh -L 58000:127.0.0.1:8000 root@202.140.140.88
```

Then open `http://localhost:58000` and authenticate with the dashboard credentials stored only in the Supabase `.env` file.
