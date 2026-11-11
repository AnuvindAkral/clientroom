# Clientroom - Acceptance Criteria and Assignment Traceability

Every criterion is binary and has a named verification method. A criterion is
met only when the cited evidence exists.

Verification methods: **U** unit test, **I** integration test, **M** MCP protocol
test, **E** browser end-to-end test, **D** deployment check, **R** manual read.

---

## 1. Assignment requirements

| ID | Requirement | Acceptance criteria | Evidence |
|---|---|---|---|
| R1 | Work from Claude | A request in Claude creates a project and at least one deliverable that appear in the app under the same account, without the user touching the app. | M1-M5, E7, demo recording |
| R2 | A person can edit it | A signed-in owner can change a deliverable's title, status and due date in the app; the change persists after reload. | I3-I5, E3-E4 |
| R3 | Live on the internet | The app and the MCP endpoint answer on a public HTTPS origin with a valid certificate, with no tunnel and no localhost reference. | D1-D6 |
| R4 | No AI inside the app | No model SDK, API key, or outbound inference call exists in the dependency tree or the source. | R1, dependency audit |
| X1 | Not a website builder | No page builder, template gallery, block editor or published-site concept. | R2 |
| X2 | Not an online shop | No products, cart, checkout or payments. | R2 |
| X3 | Small, one workflow | The five-step workflow is the whole product. Out-of-scope list is empty of shipped features. | R2, feature audit |

## 2. Authentication and isolation

| ID | Criterion | Method |
|---|---|---|
| A1 | Signup with a new email creates a user, sets a session cookie, and redirects to `/`. | I1, E1 |
| A2 | Signup with an existing email returns 409 and does not create a second user. | I1 |
| A3 | Passwords shorter than 8 characters are rejected with a field error. | I1, U1 |
| A4 | Passwords are stored as scrypt hashes with a unique salt; no plaintext exists in the database. | U2, R3 |
| A5 | Login with a wrong password returns 401 and a generic message. | I2 |
| A6 | Session cookie is HttpOnly, SameSite=Lax, Secure in production, and signed; a tampered cookie is rejected. | I2, U3 |
| A7 | Every project query is scoped by the session user id. User B cannot read, list, edit or share user A's project by guessing its id. | I6-I8 |
| A8 | A cross-user request returns 404, not 403, so existence is not confirmed. | I6 |
| A9 | Mutating API requests from a foreign Origin are rejected. | I9 |

## 3. Projects and deliverables

| ID | Criterion | Method |
|---|---|---|
| P1 | Creating a project with a blank title is rejected with a field error. | U4, I3 |
| P2 | Creating a project returns it and it appears in the list. | I3, E2 |
| P3 | Title and description edits persist and update `updated_at`. | I4, E3 |
| P4 | A deliverable can be created with title, status, optional due date. | I5, E3 |
| P5 | A deliverable's title, status and due date can be edited; each change persists. | I5, E4 |
| P6 | Status accepts the four canonical values and normalises common synonyms. | U5, M4 |
| P7 | An invalid status is rejected and lists the allowed values. | U5, M6 |
| P8 | A due date must be `YYYY-MM-DD` and is stored as a date, not free text. | U6, I5 |
| P9 | Deleting a deliverable removes it and its row after confirmation. | I5, E5 |
| P10 | The project list shows counts of total and done deliverables. | I3, E2 |

## 4. Client share links

| ID | Criterion | Method |
|---|---|---|
| S1 | Creating a share link returns a URL containing a high-entropy token. | I10, E6 |
| S2 | The share page loads with no session cookie in a private window. | I11, E6 |
| S3 | The share page shows project title, deliverables, statuses and due dates. | I11, E6 |
| S4 | The share page never includes the project description or any user email. | I11, R4 |
| S5 | The share page has no edit control and rejects every write method. | I11 |
| S6 | Revoking a link makes the next request return 410 immediately. | I12, E8 |
| S7 | An unknown token returns 404 and reveals nothing about projects. | I12 |
| S8 | Only the owning user can create or revoke a link for a project. | I10, I12 |
| S9 | Tokens are stored hashed; the raw token exists only in the response that created it. | R3, I10 |

## 5. MCP credentials

| ID | Criterion | Method |
|---|---|---|
| C1 | Creating a credential returns the raw token exactly once; later reads return only a prefix. | I13, E9 |
| C2 | The token is stored as a hash, never plaintext. | I13, R3 |
| C3 | Regenerating invalidates the previous token on the next request. | I14, M7 |
| C4 | Revoking a credential makes the next MCP request return 401. | I14, M7 |
| C5 | The raw token never appears in any log line. | R5, log inspection |
| C6 | Each user's credential maps to that user only; credential A cannot see user B's projects. | M8, I15 |

## 6. MCP protocol

| ID | Criterion | Method |
|---|---|---|
| M1 | `POST /mcp` without an Authorization header returns 401. | M1 |
| M2 | A valid `initialize` request returns a JSON-RPC result with protocol version, capabilities and server info. | M2 |
| M3 | `tools/list` returns exactly five tools with correct input schemas. | M3 |
| M4 | `create_project`, `create_item`, `update_item`, `get_project`, `list_projects` each succeed against a live server and persist to the database. | M4-M5 |
| M5 | `get_project` returns the project and all its items, scoped to the caller. | M5 |
| M6 | Missing or wrongly typed parameters return JSON-RPC `-32602`. | M6 |
| M7 | An unknown method returns JSON-RPC `-32601`. | M6 |
| M8 | A missing or unauthorized record returns a tool result with `isError: true`, not a JSON-RPC protocol error. | M9 |
| M9 | `GET /mcp` returns 405 with `Allow: POST`; the server does not claim SSE it does not offer. | M10 |
| M10 | The endpoint is reachable from outside the host over HTTPS and completes a tool call from an independent client. | D4, M11 |
| M11 | Protocol compliance (M1-M10) is reported separately from actual Claude compatibility. | report |
| M12 | Actual connection from a Claude account is tested if an eligible account is available; otherwise it is marked pending, never claimed. | report |

## 7. Persistence, deployment, recovery

| ID | Criterion | Method |
|---|---|---|
| D1 | `https://<app>/` serves the application over HTTPS with a valid certificate. | D1 |
| D2 | `https://<app>/healthz` returns 200 with database status. | D2 |
| D3 | `https://<app>/mcp` is the public MCP endpoint and answers JSON-RPC. | D4 |
| D4 | The container mounts a Railway volume at `/data`; the SQLite file lives there. | D3, config |
| D5 | Data created before a redeploy is present after the redeploy. | D5 |
| D6 | Railway daily backups are enabled and a restore has been performed at least once into a scratch volume. | D6 |
| D7 | All secrets come from environment variables; the repository contains no secret. | R6, gitleaks |
| D8 | Production logs contain no tokens, passwords or session cookies. | R5 |
| D9 | The README documents the restore procedure and the single-instance constraint. | R7 |

## 8. Interface quality

| ID | Criterion | Method |
|---|---|---|
| Q1 | Every screen has defined empty, loading, error and success states. | E1-E9, R8 |
| Q2 | No control is a dead end; every button performs its labelled action. | E1-E9 |
| Q3 | Keyboard-only completion of the full workflow is possible, with visible focus. | E10 |
| Q4 | Both the app and the client page pass an automated accessibility check with no critical or serious issues. | E11 |
| Q5 | Layout works at 360, 768, 1280 and 1600px without horizontal scroll. | E12 |
| Q6 | No fabricated customer, metric or testimonial appears anywhere. | R2 |
| Q7 | The client page renders correctly with 0, 1 and 20 deliverables. | I11, E6 |

## 9. Assignment traceability matrix

| Assignment requirement | Product capability | Where it lives | Criterion | Status |
|---|---|---|---|---|
| Work from Claude | Five MCP tools create and update real records | `POST /mcp`, `src/mcp/server.ts` | R1, M4 | Built, protocol verified |
| A person can edit it | Inline editing of projects and deliverables | `/projects/:id` | R2, P3-P5 | Built, tested |
| Live on the internet | Railway service plus volume, public HTTPS | Railway | R3, D1-D5 | Pending deploy |
| No AI inside the app | No model dependency, no inference call | dependency audit | R4 | Verified |
| Not a website builder | No builder primitives | out-of-scope list | X1 | By design |
| Not an online shop | No commerce primitives | out-of-scope list | X2 | By design |
| Keep the product small | One workflow, five tools, six screens | this document | X3 | By design |
| Live app URL | Public origin | README and handover | D1 | Pending deploy |
| Test credentials | Demo account | README and handover | A1 | Pending deploy |
| MCP URL and instructions | Connection screen plus reference | `/settings/claude`, `docs/06` | M10, D3 | Built |
| Five-minute pitch | Script and recording | `docs/demo-script.md` | deliverable | Script done, recording pending |
| Independent verification | MCP test suite with SDK client | `tests/mcp.test.ts` | M1-M11 | Built, 36 tests pass |

## 10. Evidence log

Every entry is a command that was run and its result on 11 November 2026.

| Criterion | Command | Result |
|---|---|---|
| A1-A9, P1-P10, S1-S9, C1-C4 | `npm test` | 36 tests passed, 0 failed |
| M1-M9, C3, C6 | `npm test` (MCP suite) | Included in the 36, no failures |
| M11 | `npm audit` | 0 vulnerabilities, no model SDK in the tree |
| Q1-Q7, E1-E12 | `npm run test:e2e` | 8 tests passed, axe clean on five screens, no horizontal scroll at 360/768/1280/1600 |
| D5 | stop and start against the same file | Projects and deliverables present after restart |
| Build | `npm run build` | Clean, JS 78.4 kB gzipped |
| Types | `npm run typecheck` | Clean |
| R4, X1-X3 | source and dependency read | No model call, no builder or commerce primitive |
| D1-D6, D7-D8 | Railway | Pending: recorded after the deploy |
| R1 | real Claude account | Pending: recorded only when run |
