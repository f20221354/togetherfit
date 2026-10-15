# Running togetherfit on your own server

One server runs the app and Caddy (which handles HTTPS); the database is a
managed Postgres (Neon, Supabase, RDS…), so backups and upgrades are handled
by the provider.

## 1. Before you start

- A server with Docker (2 vCPU / 2 GB RAM is plenty to start), e.g. a VPS
  in Mumbai for Indian users.
- Your domain's DNS: an `A` record (and `AAAA` if you have IPv6) for the
  domain and `www` pointing at the server.
- A managed Postgres database and its connection string.
- Email: SES with your domain verified (or Gmail SMTP for testing).

## 2. Configure

```bash
git clone <repo> togetherfit && cd togetherfit
cp .env.example .env
# Fill in DOMAIN, DATABASE_URL, AUTH_SECRET, CRON_SECRET, email, CAPTCHA keys.
```

## 3. Create the tables

```bash
docker compose build
docker compose run --rm app node db/migrate.mjs
```

Running it again later is safe; it only adds what's missing.

## 4. Start

```bash
docker compose up -d
```

Caddy gets the HTTPS certificate on first start. Open `https://<DOMAIN>`.

## 5. Make yourself an admin

Sign up in the app, then:

```bash
docker compose run --rm app node scripts/grant-admin.mjs you@example.com
```

## 6. Updating

```bash
git pull
docker compose build app
docker compose run --rm app node db/migrate.mjs
docker compose up -d app
```

## What runs where

| Service | What it does |
|---|---|
| `app` | The Next.js server (standalone build), as a non-root user, with a health check. Chat is instant (`REALTIME=sse`), using one extra database connection |
| `caddy` | HTTPS, compression, and the real client IP in `X-Forwarded-For` |
| `cron` | Calls `/api/cron/cleanup-messages` daily with `CRON_SECRET` |

## Monitoring

- **Crash alerts:** set `ERROR_WEBHOOK_URL` to a Slack or Discord incoming
  webhook. Server errors and crashes caught by the app's error pages are
  posted there, each distinct error at most once every 10 minutes. Reports
  carry the error and page path only, never request data.
- **Logs:** every error is one JSON line in `docker compose logs app`
  (search for `"level":"error"`).
- **Uptime:** point a free monitor (UptimeRobot, Better Stack…) at
  `https://<DOMAIN>/api/health` every minute, with alerts to your phone. It
  returns 200 when the app and database are up, and 503 when the database
  is down. Docker's own health check uses the same URL.

## Backups

Turn on daily backups and point-in-time recovery in your database
provider, and do one restore rehearsal before launch: restore to a new
database, point a test copy of the app at it, and sign in.
