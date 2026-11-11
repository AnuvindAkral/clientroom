# Clientroom - Architecture (Verified)

**Status:** Frozen for build. Changes require a written amendment.
**Host:** Railway, single service, SQLite on a mounted volume.

---

## 1. Verified platform facts

Checked against Railway documentation on 11 Nov 2026.

| Fact | Detail | Consequence for this build |
|---|---|---|
| One volume per service | A service can mount exactly one volume | One SQLite file under `/data` |
| Volumes are runtime only | Not mounted during build or pre-deploy | Schema creation and migrations run at process start, never at build |
| Mount path is absolute | App files sit in `/app`; relative writes must mount under `/app` | Use `DATABASE_PATH=/data/clientroom.db`, absolute |
| Replicas are not allowed with a volume | Railway prevents two active deployments on the same volume | Single instance by design; no horizontal scaling |
| Redeploy causes brief downtime | Old deployment must stop before the new one mounts | Accept and document; healthcheck still used |
| Volume size | 5GB on Hobby, 0.5GB on Trial | Far above need; database will be megabytes |
| Backups | Daily, weekly or monthly schedules; daily kept 6 days; manual backups; restore staged then applied | Enable daily, take a manual backup before the first production deploy |
| Backup limit | Manual backup limited to 50% of volume size | Irrelevant at this scale |
| Permissions | Volume mounts as root; non-root images need `RAILWAY_RUN_UID=0` | Container runs as root; no override needed |
| Public networking | Railway provides an HTTPS domain with a managed certificate | Satisfies the public HTTPS requirement with no extra proxy |
| Streaming | Containers stay resident; no serverless request ceiling | Full Streamable HTTP compatibility |

## 2. Stack

| Layer | Choice | Why |
|---|---|---|
| Runtime | Node.js 22 LTS | Matches the local toolchain, long support |
| HTTP | Express 5 | Stable, small surface, well understood |
| Database | SQLite via `better-sqlite3` | Synchronous, fast, prebuilt binaries, no service to run |
| Validation | Zod | Shared schemas for API and MCP, one source of truth |
| MCP | `@modelcontextprotocol/sdk` | Official implementation of Streamable HTTP and JSON-RPC |
| Frontend | React 19 + Vite | Small bundle, fast build, no framework runtime overhead |
| Styling | Handwritten CSS with custom properties | Precise control of the visual system, no utility soup |
| Tests | Vitest + Supertest + Playwright | Unit, integration, protocol and browser coverage |
| Container | Docker, `node:22-bookworm-slim` | Reproducible on Railway |

No ORM. Plain prepared statements. No state library. No component library.

## 3. Process topology

```
Railway service
├── Express (PORT)
│   ├── /api/*        session-authenticated JSON API
│   ├── /mcp          bearer-authenticated MCP, Streamable HTTP, stateless
│   ├── /s/:token     public HTML share page (server-rendered shell)
│   ├── /assets/*     immutable hashed Vite output
│   ├── /healthz      liveness and database check
│   └── /*            SPA shell
└── /data/clientroom.db   mounted volume, WAL mode
```

One process, one port, one deployable. No queue, no worker, no cache service.

## 4. Database

SQLite, `journal_mode=WAL`, `foreign_keys=ON`, `busy_timeout=5000`,
`synchronous=NORMAL`.

### users

| Column | Type | Notes |
|---|---|---|
| `id` | TEXT PK | UUID v4 |
| `email` | TEXT UNIQUE NOT NULL | lowercased and trimmed |
| `password_hash` | TEXT NOT NULL | `scrypt$N$r$p$salt$hash` |
| `mcp_token_hash` | TEXT UNIQUE NULL | SHA-256 of the raw token |
| `mcp_token_prefix` | TEXT NULL | first 12 characters, for display |
| `mcp_token_created_at` | TEXT NULL | ISO 8601 |
| `created_at` | TEXT NOT NULL | ISO 8601 |

Session state is a signed cookie, not a table. This keeps the frozen four-table
model intact.

### projects

| Column | Type | Notes |
|---|---|---|
| `id` | TEXT PK | UUID v4 |
| `user_id` | TEXT NOT NULL | FK users, cascade |
| `title` | TEXT NOT NULL | 1 to 200 chars |
| `description` | TEXT NOT NULL DEFAULT '' | internal only, never public |
| `status` | TEXT NOT NULL DEFAULT 'active' | `active` only in this release |
| `created_at`, `updated_at` | TEXT NOT NULL | ISO 8601 |

### items

| Column | Type | Notes |
|---|---|---|
| `id` | TEXT PK | UUID v4 |
| `project_id` | TEXT NOT NULL | FK projects, cascade |
| `title` | TEXT NOT NULL | 1 to 200 chars |
| `status` | TEXT NOT NULL DEFAULT 'not_started' | canonical set |
| `due_date` | TEXT NULL | `YYYY-MM-DD` |
| `created_at`, `updated_at` | TEXT NOT NULL | ISO 8601 |

Items inherit ownership through their project. The frozen table definition has
no `user_id` on items, so ownership is enforced by joining `projects.user_id`
on every item read and write. Documented, not accidental.

### share_links

| Column | Type | Notes |
|---|---|---|
| `id` | TEXT PK | UUID v4 |
| `project_id` | TEXT NOT NULL | FK projects, cascade |
| `token_hash` | TEXT UNIQUE NOT NULL | SHA-256 of the raw token |
| `created_at` | TEXT NOT NULL | ISO 8601 |
| `revoked` | INTEGER NOT NULL DEFAULT 0 | 0 or 1 |
| `expires_at` | TEXT NULL | deferred, always null in this release |

Indexes: `projects(user_id, updated_at)`, `items(project_id)`,
`share_links(project_id)`, `share_links(token_hash)`.

Migrations: `PRAGMA user_version`, applied in order at boot inside a
transaction. Idempotent.

## 5. HTTP API

Session cookie `cr_session`, signed HMAC-SHA256, 7-day expiry, HttpOnly,
SameSite=Lax, Secure when `NODE_ENV=production`.

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/auth/signup` | Create account |
| POST | `/api/auth/login` | Sign in |
| POST | `/api/auth/logout` | Clear session |
| GET | `/api/me` | Current user and MCP credential summary |
| GET | `/api/projects` | List with counts |
| POST | `/api/projects` | Create |
| GET | `/api/projects/:id` | Project and items |
| PATCH | `/api/projects/:id` | Title, description |
| POST | `/api/projects/:id/items` | Create deliverable |
| PATCH | `/api/items/:id` | Update deliverable |
| DELETE | `/api/items/:id` | Delete deliverable |
| POST | `/api/projects/:id/share` | Create link, revoke previous |
| DELETE | `/api/projects/:id/share` | Revoke active link |
| POST | `/api/mcp-credential` | Create credential, reveal once |
| POST | `/api/mcp-credential/regenerate` | Rotate |
| DELETE | `/api/mcp-credential` | Revoke |

All responses are JSON. Errors use `{ error: { code, message, fields? } }`.
Every mutation validates the session, then ownership, then input.

## 6. MCP

### Transport

Streamable HTTP, stateless mode. `POST /mcp` with `Authorization: Bearer`.
A server and transport pair is created per request, so no session state is held
in memory and no sticky routing is required.

`GET /mcp` and `DELETE /mcp` return 405 with `Allow: POST`. The server does not
advertise an SSE stream it does not provide, which the specification permits.

Responses use `enableJsonResponse: true`, so a POST containing requests returns
`application/json`. This removes any dependency on long-lived connections
through Railway's edge.

### Error model

Three layers, deliberately separated. This supersedes the single-table error
description in 08D section 6, which conflated protocol and application errors.
The correction follows the MCP specification's own distinction between
protocol errors and tool execution errors.

| Layer | Condition | Response |
|---|---|---|
| HTTP | Missing or invalid bearer token | `401`, `WWW-Authenticate: Bearer` |
| HTTP | Body is not valid JSON | `400` with JSON-RPC `-32700` |
| JSON-RPC | Malformed request object | `-32600` |
| JSON-RPC | Unknown method | `-32601` |
| JSON-RPC | Schema violation, missing or wrong type | `-32602` |
| Tool result | Record missing, not owned, conflict | `isError: true` with a readable message |
| Tool result | Unexpected failure | `isError: true` with a generic message, details in the server log |

Rationale: `-32603` for a missing record tells the client the server broke. It
did not. A tool execution error is a normal outcome the model can read and act
on, so it belongs in the result. Protocol misuse stays in the JSON-RPC error
channel. This is both more correct and more useful to Claude.

### Tools

| Tool | Input | Output |
|---|---|---|
| `create_project` | `title` 1-200, `description` 0-2000 | project |
| `create_item` | `project_id`, `title` 1-200, `status`, `due_date?` | item |
| `update_item` | `id`, at least one of `title`, `status`, `due_date` | item |
| `get_project` | `id` | project plus items |
| `list_projects` | none | projects with counts |

Status input is an enum with synonym normalisation. Dates are `YYYY-MM-DD`.
Unknown project or item ids return an `isError` result with the same wording as
an ownership failure.

## 7. Share links

Raw token: 24 random bytes, base64url, 32 characters. Stored as SHA-256.
Creating a link revokes any previous active link for that project, so a project
has at most one live link. Revocation is a row update, effective on the next
request. The client page is server-checked on every load: revoked returns 410,
unknown returns 404.

The page is rendered server-side into the SPA shell with the project payload
embedded, so the client sees content without a second round trip and without a
session.

## 8. Security

| Control | Implementation |
|---|---|
| Password hashing | scrypt N=16384, r=8, p=1, 16-byte salt, 64-byte key |
| Session | HMAC-SHA256 signed payload, constant-time compare, 7 days |
| CSRF | SameSite=Lax plus Origin check on every mutating request |
| Headers | CSP, nosniff, frame-ancestors none, referrer policy |
| Rate limiting | In-memory per-IP limit on auth and credential endpoints |
| Input limits | JSON body capped at 32KB; field lengths enforced |
| Logging | Method, path, status, duration, request id. Never body, token or cookie |
| Secrets | Environment only; `.env` ignored; gitleaks pre-commit |
| MCP token | 32 random bytes, SHA-256 at rest, shown once, rotatable |
| Share token | 24 random bytes, SHA-256 at rest, revocable |
| Enumeration | Cross-user access returns 404, never 403 |

## 9. Deployment

`railway.json` sets the Dockerfile build, start command and healthcheck.
Volume mounted at `/data`. Environment:

| Variable | Purpose |
|---|---|
| `PORT` | Injected by Railway |
| `DATABASE_PATH` | `/data/clientroom.db` |
| `SESSION_SECRET` | 32+ random bytes, generated once |
| `APP_ORIGIN` | Public HTTPS origin, used for links and cookie security |
| `NODE_ENV` | `production` |
| `SEED_DEMO` | Optional, seeds the labelled demo account |

Healthcheck: `/healthz` returns 200 only when `SELECT 1` succeeds.

Backups: Railway daily schedule on the volume, 6-day retention, plus a manual
backup before the first production deploy. Restore is a staged volume swap in
the Railway dashboard. Procedure documented in `docs/05-operations.md`.

## 10. Known constraints and accepted trade-offs

1. Single instance. No replicas with a volume. Fine at this scale, stated
   openly in the handover.
2. Brief downtime on redeploy while the volume remounts.
3. SQLite is one writer at a time. WAL plus a 5s busy timeout is appropriate
   for a small studio tool, not for high write concurrency.
4. `POST /mcp` is stateless. No server-initiated notifications. Not needed for
   tool-calling connectors.
5. Vercel is used only for preview builds, never production, because its
   filesystem is ephemeral.
