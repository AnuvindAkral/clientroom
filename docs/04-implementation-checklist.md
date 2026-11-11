# Clientroom - Implementation Checklist

Order follows the approved build sequence. Each milestone ends with evidence,
not an opinion.

---

## 0. Tooling and skill mapping

Skills inspected before the build, and how each is actually used.

| Workstream | Skill or tool | Why it fits | How it is used |
|---|---|---|---|
| Product gate | `frontend-design` | Forces a specific visual point of view instead of a default dashboard | Visual system in `01-journeys-and-screens.md`, status-stamp signature |
| Visual review | `web-design-guidelines` | Interface rules from Vercel's guideline set | Pre-handover UI review against the fetched rule list |
| Accessibility | `accessibility` | WCAG 2.2 AA structure | Keyboard, focus, contrast and semantics checks; automated audit |
| No-slop copy | `no-ai-slop` | Removes templated marketing voice | Copy review of every user-facing string |
| Code structure | `graphify` | AST index of the new repo | `graphify build .` after scaffold, queries instead of blind grep |
| Protocol testing | MCP Inspector or the SDK client | Independent protocol check, separate from Claude | `tests/mcp.test.ts` plus a manual Inspector pass |
| Browser verification | Playwright | Real browser, real states | `tests/e2e` and responsive screenshots |
| Deployment | `deploy-to-vercel` | Vercel CLI knowledge | Preview builds only; production stays on Railway |
| Verification discipline | `verification-before-completion` | No completion claim without command output | Evidence table in `docs/02` filled from real runs |
| Debugging | `systematic-debugging` | Reproduce before fixing | Used for any failing test or runtime issue |

Skills deliberately not used: 3D, shaders, animation libraries, design
marketplace generators, video tooling. They do not serve this product.

## 1. Foundation

- [x] `package.json`, Node 22, ESM, scripts for dev, build, start, test
- [x] TypeScript strict on server and web
- [x] `src/config.ts` validating environment at boot, failing loudly on missing secrets
- [x] `.gitignore` covering `node_modules`, `dist`, `.env`, `data`, logs
- [x] `.env.example` with every variable and no real value
- [x] gitleaks pre-commit hook, `core.hooksPath` set
- [x] Express app with security headers, JSON limit, request id, structured logger
- [x] `/healthz`

Evidence: `npm run typecheck`, `npm test`, server boots, `curl /healthz`.

## 2. Database and migrations

- [x] `src/db/schema.sql` with four tables, indexes, foreign keys
- [x] Migration runner using `PRAGMA user_version`, transactional, idempotent
- [x] Connection module: WAL, foreign keys, busy timeout, absolute path check
- [x] Repository modules per table with prepared statements
- [x] Startup fails with a clear message if `DATABASE_PATH` is not writable

Evidence: fresh database created from empty file; second boot does not re-run
migrations; `sqlite3 .schema` matches the document.

## 3. Authentication and isolation

- [x] scrypt hash and verify with per-user salt, constant-time compare
- [x] Signed session cookie, HttpOnly, SameSite=Lax, Secure in production
- [x] Signup, login, logout, `/api/me`
- [x] Auth middleware resolving the session to a user id
- [x] Origin check on mutations
- [x] Rate limit on auth endpoints
- [x] Ownership helper used by every project and item query

Evidence: integration tests A1-A9 green, including cross-user attempts.

## 4. Projects

- [x] List with counts, ordered by `updated_at`
- [x] Create with validation
- [x] Read one with items
- [x] Update title and description
- [x] Every query scoped by `user_id`

Evidence: tests P1-P3, P10.

## 5. Deliverables

- [x] Create, update, delete
- [x] Status canonicalisation and validation
- [x] Date validation
- [x] `updated_at` maintained on every write, project touched on item change

Evidence: tests P4-P9.

## 6. Client share

- [x] Token generation, hashing, storage
- [x] One active link per project, previous revoked on create
- [x] Public route with server-side lookup
- [x] Revoked 410, unknown 404
- [x] No description, no email, no write methods
- [x] `noindex`, no analytics

Evidence: tests S1-S9, private-window browser check.

## 7. MCP credential

- [x] Generate 32-byte token, prefix, hash, timestamp
- [x] Reveal once, prefix afterwards
- [x] Regenerate and revoke
- [x] Bearer middleware with constant-time hash lookup
- [x] No token in logs, asserted by test

Evidence: tests C1-C6.

## 8. MCP server

- [x] Official SDK, Streamable HTTP, stateless, JSON responses
- [x] Five tools registered with Zod schemas and descriptions
- [x] Ownership enforced inside every tool
- [x] App errors as `isError` results, protocol errors as JSON-RPC codes
- [x] `GET` and `DELETE` return 405 with `Allow: POST`
- [x] Auth failure returns 401 with `WWW-Authenticate`

Evidence: tests M1-M12, including a raw JSON-RPC client and the SDK client.

## 9. Frontend

- [x] Vite build, single bundle, 78 kB gzipped against a 250 kB budget (no route splitting: six screens on one shell, a split would only add round trips)
- [x] Design tokens, typography, layout shell
- [x] Login, signup
- [x] Project list, empty state, create
- [x] Project detail, inline editing, add and delete rows, share panel
- [x] Settings and credential flow
- [x] Client share page
- [x] 404 and 410 pages
- [x] Toasts, skeletons, inline errors
- [x] Responsive at 360, 768, 1280, 1600
- [x] Keyboard and focus states
- [x] Reduced motion

Evidence: Playwright screenshots at four widths, axe run, keyboard run.

## 10. Observability and failure

- [x] Central error handler, no stack traces to clients
- [x] Request log with status and duration
- [x] Database failure surfaced on `/healthz`
- [x] Graceful shutdown closing SQLite
- [x] Unhandled rejection logged, process exits, Railway restarts

Evidence: forced failure tests, log inspection.

## 11. Production deployment

- [x] Dockerfile builds locally
- [ ] Railway project, service, volume at `/data`
- [ ] Environment variables set, none in git
- [ ] Public domain with valid certificate
- [ ] Daily backup schedule enabled
- [ ] Manual backup taken before first production data
- [ ] Redeploy persistence test
- [ ] Restore rehearsal into a scratch volume

Evidence: `docs/05-operations.md`, filled with real commands and results.

## 12. Handover

- [ ] Demo account credentials
- [ ] MCP URL and connection steps
- [x] `docs/06-mcp-reference.md`
- [x] `docs/05-operations.md`
- [x] `docs/07-test-report.md`
- [x] `docs/demo-script.md`, five minutes, timed
- [x] `docs/08-limitations.md`
- [x] Traceability report with evidence
- [ ] Repository clean, no secrets, no build output committed

Evidence: final audit run.

---

## Stop conditions

Stop and report rather than proceed if any of these is true:

1. Railway cannot mount a volume or the service cannot write to `/data`.
2. The MCP SDK cannot serve stateless JSON responses on the installed version.
3. A cross-user isolation test fails.
4. The public endpoint cannot be reached over HTTPS.
5. Any required secret would have to be committed to make it work.
