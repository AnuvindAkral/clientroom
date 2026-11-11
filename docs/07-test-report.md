# Test report

What was run, on what, and what each check does and does not prove.

Date: 11 November 2026. Host: macOS, Node 22.22, Chrome for Testing (build 1248) driven by
Playwright.

## Summary

| Check | Command | Result |
| --- | --- | --- |
| Types | `npm run typecheck` | Clean, no errors |
| Production build | `npm run build` | Clean, JS 78.4 kB gzipped, CSS 3.6 kB gzipped |
| Backend and API tests | `npm test` | 36 passed, 0 failed |
| Browser end-to-end | `npm run test:e2e` | 8 passed, 0 failed |
| Dependency audit | `npm audit` | 0 vulnerabilities |
| Production container | `docker build`, `docker run` with a bind mount at `/data` | Health ok, MCP 401/405, data survived a restart |
| Live acceptance, 44 checks | `BASE=https://clientroom-production.up.railway.app node tools/production-check.mjs` | 44 passed, 0 failed |
| Official SDK client over HTTPS | `node tools/mcp-client-check.mjs <url> <token>` | 8 passed, 0 failed |
| Live redeploy persistence | `railway redeploy`, then `--after-redeploy` | 5 passed, 0 failed |
| Log hygiene | `railway logs` grep for the live token, cookies and passwords | 0 matches |
| Real Claude connection | not run | Pending, see the last section |

The browser suite runs against `npm run build` output with `NODE_ENV=production`, not
against the dev server, so the artefact that ships is the artefact that was tested.

## Backend suite, 36 tests

`tests/api.test.ts` drives the HTTP API through Supertest with a temporary database per
run. It covers account creation and duplicate rejection, short passwords, wrong passwords,
tampered session cookies, foreign-origin writes, project and deliverable create, read,
update and delete, status synonyms, malformed dates, counts, cross-user isolation on
projects, items and share links, share page rendering without a session, revocation
returning 410, unknown tokens returning 404, re-reading an active link, replacing a link,
and credential reveal, rotation and revocation.

`tests/mcp.test.ts` speaks JSON-RPC over HTTP to a live server with a real bearer token. It
covers a missing and an invalid token (401), `GET` and `DELETE` (405), a malformed body
(-32700), `initialize`, `tools/list` returning exactly five tools with their schemas,
unknown method (-32601), missing required parameters (-32602), all five tools against a
real database, a missing record returning `isError: true` rather than a protocol error,
credential isolation between two users, and a rotated credential failing on the next call.

Nothing in either suite asserts against a mock: the MCP tests go through the same
Express handler, the same token lookup and the same SQLite file as production.

## Browser suite, 8 tests

| Test | Proves |
| --- | --- |
| E1 to E5 | Signup, empty workspace, first project, two deliverables, inline title edit, due date, delete with confirmation, all persisted across reloads |
| E6 to E8 | Client link opens in a fresh context with no cookies, shows deliverables, and returns 410 immediately after revocation |
| E9 | Credential is revealed once, and only a prefix remains after reload |
| E10 | The first project is completed with the keyboard alone: focus, type, submit |
| E12 | No horizontal scroll at 360, 768, 1280 and 1600 px |
| Q4 | axe reports no critical or serious violation on the app screens and the client page |
| D5 | Data survives a full reload and a second sign-in |
| Isolation | A second account cannot see the first account's project, by list or by direct URL |

Screens checked with axe: sign in, projects, project detail, Connect Claude, and the public
client page. The client page is checked in a separate browser context with no session,
because that is how a client sees it.

## Manual checks, not automated

These were run by hand against the production build and are recorded here because no test
asserts them.

- **The production container.** `docker build` succeeded, the image ran with a bind mount
  standing in for the Railway volume, `/healthz` returned ok, `/login` and `/` served the
  built app, an unauthenticated `POST /mcp` returned 401 and `GET /mcp` returned 405. The
  seed wrote one user, one project and four deliverables into the mounted file, the
  container was restarted, and all four deliverables were still there. This is the same
  check Railway performs, done one layer earlier.
- **Persistence across a restart.** A project and four deliverables were created, the
  process was stopped and started against the same file, and everything was still there.
  The seeded account was also re-read after a restart.
- **Session cookie flags.** Inspected in the browser: HttpOnly, SameSite=Lax, and Secure
  when `NODE_ENV=production` and `APP_ORIGIN` is https.
- **Token visibility.** The raw MCP token appears once in the create response and never in
  a log line or a later read.
- **Share page content.** The internal note is absent, no email appears, and no control is
  present beyond the text.
- **Copy.** No em dash in the interface or in the seed data, checked with grep over the
  source.

## Production acceptance, 44 checks

`tools/production-check.mjs` runs against the live origin with no local state. It creates
its own account, project, deliverables, client link and MCP credential, then checks:

- HTTPS, health, the app shell, an unauthenticated MCP request (401) and `GET /mcp` (405).
- Signup, session cookie flags, short password, duplicate email, foreign origin write.
- Project and deliverable create, edit, status normalisation, rejected values, delete.
- Client link creation, the page in a fresh request with no cookie, the internal note and
  email absent, a write rejected with 405 and `Allow: GET`, revocation returning 410, an
  unknown token returning 404.
- A second account receiving 404 for the first account's project and an empty list.
- Credential reveal once, then only a prefix on later reads.
- `initialize`, `tools/list` returning exactly five tools, all five tools working,
  `-32602` for bad arguments, `-32601` for an unknown method, `isError` for a missing
  record, and the old token returning 401 after regeneration.

Result: 44 passed, 0 failed.

A real redeploy followed: `railway redeploy` rebuilt the image, the container restarted, and
`--after-redeploy` signed in with the account created before the deploy, read the project,
and found both deliverables with the edited status intact. 5 passed, 0 failed.

`tools/mcp-client-check.mjs` then connected to the same endpoint with the official MCP SDK
client and the Streamable HTTP transport, the path a real connector takes. It connected,
listed five tools, created a project, created a deliverable with a status synonym, read
both back, listed projects, and received an `isError` result for a missing record. 8 passed,
0 failed. This is the strongest protocol evidence in the report, and it still is not a
Claude account.

The demo account (`demo@clientroom.app`) also signed in on the live origin and returned its
seeded sample project with four deliverables.

The request log was checked after the run: zero matches for the live MCP token, any session
cookie value, or a password.

## What this does not prove

- **A real Claude account reaching the endpoint.** Not tested. The protocol tests prove the
  server answers correctly; they do not prove a specific Claude plan, connector setting or
  network path. Reported separately and never claimed as done.
- **Safari and Firefox.** Only Chromium was exercised. The CSS uses no engine-specific
  feature, but it was not verified.
- **Load.** No concurrency test. The product targets a handful of users on one instance;
  SQLite serialises writes.
- **Backup restore on Railway.** Not done. Railway answered that manual backups and backup
  schedules require a Pro workspace, so this Hobby deployment has no platform snapshot to
  restore. The file-level alternative is written in
  [docs/05-operations.md](05-operations.md) but was not run, because pulling the file needs
  an SSH key registered with Railway. Until one of those happens, the criterion is open.
- **Long-lived behaviour.** No soak test, no migration rehearsal from an older schema,
  because there is only one schema version so far.
