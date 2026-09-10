# Deploying to a Hetzner VPS

This is the domain-and-registry-specific companion to [`docs/docker.md`](./docker.md) — that
doc explains the Dockerfile/compose mechanics in general; this one walks through getting
`hectohr.com` actually live on a VPS. Skim `docs/docker.md` first if the split-image
architecture (`web` / `backend` / `migrate` / `seed`) isn't already clear.

## Architecture

One Caddy container (`web`) is the sole internet-facing thing on the box. It terminates TLS
(automatic Let's Encrypt certs, no manual cert handling) and either serves a static frontend
or reverse-proxies to `backend`, per domain:

| Domain | Serves |
|---|---|
| `hectohr.com` (+ `www` → redirect) | Landing page (static) |
| `app.hectohr.com` | Manager web app (static) + `/api/*` → `backend:3000` |
| `admin.hectohr.com` | Admin web app (static) + `/api/*` → `backend:3000` |
| `files.hectohr.com` | Visitor-signature images → `minio:9000` (plain proxy, presigned URLs are signed against this exact host) |

Because `app.hectohr.com` and `admin.hectohr.com` each proxy `/api/*` to the same backend
*through their own domain*, both web apps call a same-origin relative `/api` path — no CORS
is involved for either browser app. `CORS_ORIGINS` is still set (defensively, and because
`enableCors` in `main.ts` is unconditional) but nothing in this architecture actually relies
on it. Only the employee/visitor **mobile** apps hit the API cross-origin, via an absolute
`EXPO_PUBLIC_API_URL=https://app.hectohr.com/api` — mobile clients don't enforce CORS at all,
so this needs no separate `api.hectohr.com`.

Everything else (Postgres, Redis, MinIO's S3 API, Grafana, Loki) stays on the compose-internal
network or loopback-only — see the port comments in `docker-compose.prod.yml`.

## One-time VPS setup

1. **Provision the box** (Hetzner Cloud, any size — the default CX22 is plenty to start).
2. **Point DNS at it** — five A records, all to the VPS's IPv4 (and AAAA if you have IPv6):
   `hectohr.com`, `www.hectohr.com`, `app.hectohr.com`, `admin.hectohr.com`, `files.hectohr.com`.
   Caddy requests a cert per-domain on first request to it, so **all five must resolve before
   the first deploy** or that domain's cert issuance will fail (Caddy retries automatically,
   but nothing will be reachable on it until DNS catches up).
3. **Install Docker** on the VPS (official convenience script is fine for a single box):
   ```bash
   curl -fsSL https://get.docker.com | sh
   ```
   The Compose plugin (`docker compose`, not the old standalone `docker-compose`) comes with it.
4. **Open firewall ports** 22 (SSH), 80, 443. Nothing else needs to be public — Postgres,
   Redis, the backend's direct port, MinIO's console, and Grafana are all loopback-only in
   `docker-compose.prod.yml`; reach them over an SSH tunnel when needed (each service's
   comment in that file has the exact `ssh -L ...` command).
5. **Make sure your SSH key gets you in** as whatever user `scripts/deploy/deploy.sh` will use
   (`root@<ip>` is simplest for a single-purpose box; a non-root deploy user with passwordless
   `docker` group membership works too).

## First deploy

All of this runs **locally**, from a full checkout — the server never builds anything, it only
pulls images `build-and-push.sh` pushed.

```bash
# 1. Fill in production config (once)
cp .env.production.example .env.production
scripts/deploy/generate-secrets.sh          # fills JWT/DB/Redis/MinIO/Grafana secrets
# then edit .env.production by hand: SMTP_HOST/SMTP_USER/SMTP_PASS (a real provider —
# SendGrid, Postmark, SES, Mailgun, whatever you have — Mailhog is dev-only)

# 2. Build all three images and push to GHCR
scripts/deploy/build-and-push.sh
# needs GHCR_TOKEN (a GitHub PAT with write:packages) or a logged-in `gh` CLI

# 3. Ship the compose file + .env.production + configs, pull, and start
scripts/deploy/deploy.sh root@<vps-ip-or-hectohr.com>

# 4. Seed demo data (optional — see "Demo environment" below) and create the
#    platform superadmin (there is no UI/API path for this — deliberately)
ssh root@<vps-ip> 'cd /opt/hectohr && docker compose -f docker-compose.prod.yml --env-file .env.production run --rm seed'
ssh root@<vps-ip> 'cd /opt/hectohr && docker compose -f docker-compose.prod.yml --env-file .env.production run --rm superadmin-create you@hectohr.com <a-strong-password>'
```

First boot takes a little longer than usual — Caddy has to complete the ACME (Let's Encrypt)
handshake for each of the four domains before they respond over HTTPS. `docker compose logs -f
web` on the server shows the certificate issuance if you want to watch it happen.

## Subsequent deploys

Same three steps, minus the one-time setup:

```bash
scripts/deploy/build-and-push.sh
scripts/deploy/deploy.sh root@<vps-ip>
```

`deploy.sh` pulls the new images and does `up -d --remove-orphans`; `migrate` (a one-shot
service with `restart: on-failure:3`) runs the pending migrations before `backend`/`worker`
come up, same ordering as in `docker-compose.yml` for local dev.

### Rolling back

Images are tagged by git short-sha (plus `latest`), not just overwritten:

```bash
IMAGE_TAG=<previous-sha> scripts/deploy/deploy.sh root@<vps-ip>
```

This doesn't roll back the database schema — if the bad deploy included a migration, you're
restoring from a backup instead (see [Backups & Disaster Recovery](./docker.md#backups--disaster-recovery)
in `docs/docker.md`), not just swapping the image tag.

## Demo environment

`apps/backend/src/seed/seed.ts` creates a demo organization ("Hecto Dev") with one user per
role — `admin@hecto.dev`, `hr@hecto.dev`, `manager@hecto.dev`, `employee@hecto.dev`, all with
password `hecto123` — plus a superadmin (`superadmin@hecto.dev`) and starter leave types. It's
**idempotent** (safe to re-run; it upserts rather than duplicating), but it uses a fixed,
publicly-known weak password.

**If this VPS is reachable by anyone other than you** (which it is, once `app.hectohr.com` is
live), running `seed` on it means those exact credentials work for anyone who reads this repo
or this doc. That's presumably fine for a diploma-defense demo you're actively showing people,
but treat it as public information, not a real tenant — don't put anything in that org you'd
mind a stranger seeing, and consider disabling or re-seeding with different passwords before
leaving it running unattended long-term. `create-superadmin.js` (used for your *own* superadmin
account, above) takes a password you choose and enforces a 12-character minimum — use a real one
for that account regardless of whether you also run `seed`.

## Monitoring

Grafana/Loki are already wired up (see `docs/docker.md#monitoring`) and loopback-only on this
VPS. Tunnel in:

```bash
ssh -L 3001:localhost:3001 root@<vps-ip>
# then open http://localhost:3001 locally
```

Set `SENTRY_DSN` in `.env.production` for error tracking (leave unset to no-op). Set up an
external uptime monitor against `https://app.hectohr.com/api/health` — see
`docs/docker.md#external-uptime-monitor` for why that's the one check that still fires if the
whole box goes dark.

## Troubleshooting

**A domain shows a certificate error / "not secure"** — almost always DNS not resolving to
this box yet at the moment Caddy first tried, or a firewall blocking port 80 (ACME's HTTP-01
challenge needs it, even though the end result is HTTPS on 443). Check:
```bash
ssh root@<vps-ip> 'cd /opt/hectohr && docker compose -f docker-compose.prod.yml logs web | grep -i cert'
```
Caddy retries automatically — fix DNS/firewall and it self-heals within a few minutes, no
restart needed.

**`web` can't reach `backend`** — they must be on the same compose network, which they are by
default (one `docker-compose.prod.yml`, no custom network overrides). If you split them into
separate compose invocations, that's the first thing to check.

**Manager/admin app loads but every API call 404s** — check the request is actually hitting
`/api/...` (both apps call a relative `/api`, proxied by `deploy/Caddyfile`'s `handle /api/*`
block) and that `backend`'s healthcheck is green:
```bash
ssh root@<vps-ip> 'cd /opt/hectohr && docker compose -f docker-compose.prod.yml ps backend'
```

**Signature images (visitor kiosk) don't load** — check `MINIO_PUBLIC_ENDPOINT` in
`.env.production` matches `files.hectohr.com` exactly (scheme included) — presigned URLs are
signed against that exact host, so a mismatch here breaks every signature link even though
MinIO itself is healthy.

For anything backend/Dockerfile-specific (image size, build stages, the `.dockerignore`,
Kubernetes/CI alternatives), see [`docs/docker.md`](./docker.md).
