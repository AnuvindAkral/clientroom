# 08. Testing and evidence master

## Summary

| Check | Command | Result |
|---|---|---|
| Types | `npm run typecheck` | Clean, no errors |
| Production build | `npm run build` | Clean, JS 78.4 kB gzipped, CSS 3.6 kB gzipped |
| Backend and API tests | `npm test` | 36 passed, 0 failed |
| Browser end to end | `npm run test:e2e` | 8 passed, 0 failed |
| Dependency audit | `npm audit` | 0 vulnerabilities |
| Production container | `docker build`, `docker run` with a bind mount at `/data` | Health ok, MCP 401 and 405, data survived a restart |
| Live acceptance, 44 checks | `BASE=... node tools/production-check.mjs` | 44 passed, 0 failed |
| Official SDK client over HTTPS | `node tools/mcp-client-check.mjs <url> <token>` | 8 passed, 0 failed |
| Live redeploy persistence | `railway redeploy`, then `--after-redeploy` | 5 passed, 0 failed |
| Log hygiene | `railway logs` grep for the live token, cookies and passwords | 0 matches |
| Backup off the volume | `tools/backup.sh` | integrity ok, 11 users, 10 projects, 17 items, 4 share links |
| Restore rehearsal | deployed image booted against the copy, demo account signed in | Health ok, project and all four deliverables with statuses present |
| Secret scan | `gitleaks detect` | No secret in tracked files; one ignored scratch file |

## What each test validates

### Backend and API tests (36)

`tests/api.test.ts` covers signup, login, duplicate email, short password, session
resolution, foreign origin rejection, project creation and blank title rejection,
deliverable creation, status normalisation, title edit, unknown status rejection,
deletion, share link creation and read-only page, internal note and email absence,
write rejection with 405, revocation returning 410, unknown token returning 404, and
cross-account isolation. `tests/mcp.test.ts` covers initialize, tools/list returning
exactly five tools, all five tools working, status synonym normalisation, invalid
arguments returning -32602, unknown method returning -32601, missing record returning
isError, and credential reveal once then prefix only.

Why it matters: these are the contract tests. They run on every change and catch
regressions in validation, ownership and the MCP error model.

### Browser end to end (8)

`tests/e2e/app.spec.ts` covers the full workflow in a real browser: sign up, create
project, add deliverables, edit inline, status changes, share link, client view, revoke,
isolation, no horizontal scroll at 360, 768, 1280 and 1600, and an axe accessibility pass
on five screens.

Why it matters: the unit tests do not catch layout, focus or accessibility regressions.

### Production acceptance, 44 checks

`tools/production-check.mjs` runs against the live origin with no local state. It creates
its own account, project, deliverables, client link and MCP credential, then checks
HTTPS, health, the app shell, unauthenticated MCP returning 401, GET /mcp returning 405,
signup, session cookie flags, short password, duplicate email, foreign origin write,
project and deliverable create, edit, status normalisation, rejected values, delete,
client link creation, the page in a fresh request with no cookie, the internal note and
email absent, a write rejected with 405 and `Allow: GET`, revocation returning 410,
unknown token returning 404, a second account receiving 404 and an empty list, credential
reveal once then only a prefix, initialize, tools/list returning exactly five tools, all
five tools working, -32602 for bad arguments, -32601 for an unknown method, isError for a
missing record, and the old token returning 401 after regeneration.

Why it matters: this is the only test that runs against the real deployment, the real
network and the real database.

### Official SDK client over HTTPS, 8 checks

`tools/mcp-client-check.mjs` connects with the official MCP SDK client and the
Streamable HTTP transport, the path a real connector takes. It connected, listed five
tools, created a project, created a deliverable with a status synonym, read both back,
listed projects, and received an isError result for a missing record.

Why it matters: this is the strongest protocol evidence. It uses the same client library
a real integration would use. It is still protocol evidence, not a Claude connection.

### Persistence after redeploy, 5 checks

`railway redeploy` rebuilt the image, the container restarted, and `--after-redeploy`
signed in with the account created before the deploy, read the project, and found both
deliverables with the edited status intact.

Why it matters: this proves the SQLite file on the volume survives a real redeploy, not
just a process restart.

### Backup and restore

`tools/backup.sh` pulled `clientroom.db`, `clientroom.db-wal` and `clientroom.db-shm`
off the volume. `pragma integrity_check` returned ok. Row counts: 11 users, 10 projects,
17 items, 4 share links. The deployed image booted against that copy: health ok, the demo
account signed in, the project opened with all four deliverables and their statuses.

Why it matters: a backup that has never been restored is a guess. This one was restored
and the application read it.

### Security

- Ownership isolation: second account gets 404 and an empty list.
- Credential reveal once: the token is shown on creation, only a prefix afterwards.
- Old token stops working after regeneration.
- No secret in tracked files: gitleaks finds nothing except an ignored scratch file.
- No token, cookie or password in `railway logs`: zero matches.
- Unauthenticated MCP returns 401. GET /mcp returns 405.

### Build and typecheck

`npm run typecheck` is clean. `npm run build` produces JS 78.4 kB gzipped and CSS 3.6 kB
gzipped. `npm audit` reports zero vulnerabilities.

## What is not tested

- A real Claude account connecting to the endpoint. Protocol compliance is proven, Claude
  compatibility is not. This is stated as pending in every document.
- Browser coverage is Chromium only. No Safari or Firefox automation.
- No load test, no soak test, no restore rehearsal recorded before this handover.
- No migration rehearsal from an older schema, because there is only one schema version.
- Scheduled backups, because the workspace is on the Hobby plan.
- Dark mode, internationalisation, password reset, email verification: not built, so not
  tested.
