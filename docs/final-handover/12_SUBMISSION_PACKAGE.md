# 12. Submission package

## Product overview

Clientroom is a client delivery workspace for a small design or branding studio. One
project per client engagement, the deliverables inside it, and a read-only link the client
can open without an account. The same data can be driven from Claude through an MCP
endpoint. The app itself has no model, no API key and no inference call.

## Links

- Live application: https://clientroom-production.up.railway.app
- MCP endpoint: https://clientroom-production.up.railway.app/mcp
- Repository: https://github.com/AnuvindAkral/clientroom

## Test account

- Email: `demo@clientroom.app`
- Password: `clientroom-demo-2026`
- Contents: one fabricated sample project with four deliverables, labelled "Sample",
  safe to edit.

The demo account holds only fabricated sample data. Ownership is enforced on every read
and write, so it cannot access other users' projects. Its MCP credential is not published;
one can be created from Settings in about a minute.

## Claude connection instructions

1. Sign up or sign in at the live app.
2. Open Settings, Connect Claude, Create credential. Copy the token; it is shown once.
3. In Claude: Settings, Connectors, Add custom connector. Name it Clientroom, paste the
   endpoint URL, click Continue.
4. Claude may offer OAuth. Clientroom has no OAuth server, so choose "No sign in" under
   Authentication, then under Request headers add `Authorization: Bearer <token>`. Click
   Add.
5. Enable the connector in a conversation. Ask: "Using Clientroom, create a project
   called Northwind rebrand with three deliverables: wordmark, brand guide, social kit."

Free accounts can add one custom connector, which is enough for this test.

## Feature summary

- Email and password accounts, one workspace per user.
- Create, rename and describe projects.
- Create, edit and delete deliverables with status and due date.
- Inline editing, no save button, no modal.
- Create, copy and revoke a read-only client link per project.
- Per-user MCP credential: generate, reveal once, regenerate, revoke.
- Five MCP tools: `create_project`, `create_item`, `update_item`, `get_project`,
  `list_projects`.
- Persistent storage that survives redeploys.

## Technical implementation summary

Node.js 22, Express 5, SQLite on a Railway volume, Zod 4, official MCP SDK, React 19,
Vite 6, handwritten CSS. Four tables: `users`, `projects`, `items`, `share_links`. Five
MCP tools. Stateless Streamable HTTP. HMAC-signed session cookie. Per-user bearer
credentials hashed at rest. scrypt passwords. Ownership enforced on every read and write.

## Validation summary

- 36 backend tests passed.
- 8 browser tests passed, axe clean on five screens, no horizontal scroll at 360, 768,
  1280 and 1600.
- 44 of 44 production acceptance checks passed on the live origin.
- 8 of 8 checks passed with the official MCP SDK client over Streamable HTTP.
- 5 of 5 persistence checks passed after a real redeploy.
- Backup pulled off the volume, integrity check ok, restored against a copy, application
  read the data.
- Typecheck clean, build clean, 0 vulnerabilities.
- gitleaks clean on tracked files.

## Known limitations

- A real Claude account has not been connected. Protocol compliance is verified; Claude
  compatibility is not.
- Scheduled backups need a Pro workspace. A manual copy and restore rehearsal exist.
- One owner per account, no team seats.
- No password reset, no email verification.
- No link expiry, no client comments, no file uploads, no notifications.
- Single instance, brief downtime on redeploy.
- Browser coverage is Chromium only.

## Document index

- `docs/00-product-requirements.md`: frozen scope.
- `docs/01-journeys-and-screens.md`: journeys and screens.
- `docs/02-acceptance-and-traceability.md`: acceptance matrix and evidence log.
- `docs/03-architecture.md`: architecture.
- `docs/04-implementation-checklist.md`: checklist.
- `docs/05-operations.md`: deploy, backup, restore.
- `docs/06-mcp-reference.md`: MCP reference and connection steps.
- `docs/07-test-report.md`: test report.
- `docs/08-limitations.md`: limitations.
- `docs/09-submission.md`: earlier submission package.
- `docs/demo-script.md`: demo script.
- `docs/final-handover/`: this handover set.

## Completed and pending

| Item | Status |
|---|---|
| Live application | Complete |
| Public MCP endpoint | Complete |
| Five MCP tools | Complete |
| Persistence after redeploy | Complete |
| Backup and restore rehearsal | Complete |
| Security and isolation | Complete |
| Actual Claude connection | Pending |
| Five minute pitch recording | Pending |
| Submission email | Draft ready |
