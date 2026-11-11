# 07. Security and operations

## Authentication

### Web sessions

A signed cookie, `cr_session`, carrying `{ uid, exp }`, signed with HMAC-SHA256 over the
payload. Seven day expiry. `HttpOnly`, `SameSite=Lax`, `Secure` in production. No sessions
table. This keeps the frozen four-table model intact.

On every request, `attachUser` verifies the signature with a constant-time compare, checks
the expiry, and looks up the user. A missing or invalid cookie means no user, and protected
routes return 401.

### CSRF

`SameSite=Lax` blocks most cross-site form posts. In addition, every mutating request
with an `Origin` header must match the app origin or the request's own host. Non-browser
clients such as the MCP transport do not send `Origin`, so they pass through.

### Passwords

scrypt with N=16384, r=8, p=1, a 16-byte salt and a 64-byte key. Per-user salt. Stored as
`scrypt$N$r$p$salt$hash`. Verification uses a constant-time compare.

## MCP bearer credentials

Per user, generated as `crm_` plus 32 random bytes. Stored as SHA-256. The raw token is
shown once. A prefix of 12 characters is kept for display. Regenerating replaces the hash;
the old token returns 401 on the next request. Revoking clears the hash.

`authenticateMcpRequest` reads the `Authorization` header, extracts the bearer token,
hashes it, looks up the user, then re-reads the user row so a revoked credential cannot
resolve through a stale row.

## Token storage and rotation

- MCP token: SHA-256 at rest, shown once, rotatable from Settings.
- Share token: 24 random bytes, SHA-256 at rest, revocable.
- Session token: HMAC-signed, no storage, expires in seven days.

Rotation of an MCP credential is immediate. The old token stops working on the next
request. There is no grace period.

## Ownership enforcement

Every project belongs to exactly one user. Every read and write is scoped by the
authenticated user id, never by a client-supplied user id. Cross-user access returns the
same message as a missing record, so the API does not confirm existence. This was tested:
a second account receives 404 for the first account's project and an empty list.

## Share-link security

Raw token: 24 random bytes, base64url, 32 characters. Stored as SHA-256. Creating a link
revokes any previous active link for that project, so a project has at most one live link.
Revocation is a row update, effective on the next request. The client page is checked on
every load: revoked returns 410, unknown returns 404.

The page is rendered server-side with the project payload embedded. The project description
is deliberately excluded, so internal notes never reach a client. The page carries
`noindex, nofollow` and no analytics.

## Read-only access

The client view has no editing controls, no login prompt and no session. Writes to
`/s/:token` return 405 with `Allow: GET`.

## Secrets management

- Secrets live in environment variables, set on Railway.
- `.env` is gitignored. `.env.example` is committed.
- A gitleaks pre-commit hook blocks a commit that stages a likely secret.
- No secret is logged. The MCP token and password never appear in responses after
  creation or in any log line.
- `SESSION_SECRET` must be at least 32 characters in production.

## Logging

Method, path, status, duration and request id. Never body, token or cookie. The request
log captures `req.originalUrl` so mounted routers do not mask the path.

## Deployment

`railway.json` sets the Dockerfile build, start command and healthcheck. Volume mounted at
`/data`. Environment variables: `PORT` (injected by Railway), `DATABASE_PATH`,
`SESSION_SECRET`, `APP_ORIGIN`, `NODE_ENV`, and the optional `SEED_DEMO`, `SEED_EMAIL`,
`SEED_PASSWORD`.

Healthcheck: `/healthz` returns 200 only when `SELECT 1` succeeds. Managed HTTPS
certificate from Railway.

## Persistent volume

One volume per service, mounted at `/data`. The volume is runtime only, not mounted during
build. Schema creation and migrations run at process start. Replicas are not allowed with a
volume, so the service is single instance by design.

## Backup

Railway daily schedule on the volume, 6-day retention, plus manual backups. Because this
workspace is on the Hobby plan, manual backups and schedules are not available through the
platform. The working arrangement is a file-level copy pulled with `tools/backup.sh`,
which downloads `clientroom.db`, `clientroom.db-wal` and `clientroom.db-shm` and runs
`pragma integrity_check`.

## Restore

A restore was rehearsed: the deployed image booted against a copy of the database,
`/healthz` returned ok, the demo account signed in, and the project opened with all four
deliverables and their statuses. Share tokens cannot be replayed from a backup because
only a hash is stored. Project content survives; old links do not have to.

## Known security limitations

- No password reset and no email verification. Both need outbound email.
- Rate limiting is per process and in memory. One instance makes that correct; more
  instances would need a shared store.
- Share tokens are encrypted with a key derived from `SESSION_SECRET`. Rotating that
  secret invalidates live share links.
- The demo account password is seeded and published in the README. It holds only
  fabricated sample data and can be rotated after evaluation by updating `SEED_PASSWORD`,
  deleting the demo user row and redeploying.
- No dark mode, no themes, no internationalisation.

## Evidence references

- `tests/api.test.ts`: ownership, auth, validation, share link, credential tests.
- `tests/mcp.test.ts`: MCP protocol, tools, error model.
- `tools/production-check.mjs`: 44 live acceptance checks.
- `tools/mcp-client-check.mjs`: 8 checks with the official SDK client.
- `docs/07-test-report.md`: full evidence table.
- `docs/05-operations.md`: deploy, backup and restore runbook.
