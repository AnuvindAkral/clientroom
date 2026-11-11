# 14. Personal learning guide

This document teaches the project from the ground up so you can explain it without
memorising a script. Work through the parts in order. Each part has a simple explanation,
a technical explanation, a real Clientroom example, important terminology, questions you
should be able to answer, and common misunderstandings.

## Part 1. Understand the assignment

Simple: build a small business that runs on Claude, with no AI inside the app. The customer
connects their own Claude through MCP. Claude thinks and writes. The app saves, edits,
stores and keeps the result live.

Technical: the app is a normal web application with an MCP endpoint. The model is on the
customer's side. The app never calls a model.

Real example: Clientroom. A studio asks Claude to create a project. Claude calls
`create_project` on the MCP endpoint. The app writes a row. The studio opens the app and
sees it.

Terminology: MCP (Model Context Protocol), remote MCP server, tool, client, server,
Streamable HTTP, JSON-RPC.

Questions to answer:
- What is the one thing the assignment wants you to prove?
- Where does the AI live in this architecture?
- What would violate "no AI inside the app"?

Common misunderstandings:
- Thinking the app needs an AI SDK. It does not.
- Thinking the SDK test is a Claude test. It is not.

## Part 2. Understand the business idea

Simple: a design studio keeps one list of deliverables per client, and the client can see
it without an account.

Technical: one project per engagement, items with status and due date, a read-only share
link per project, per-user ownership.

Real example: "Northwind rebrand" with wordmark, brand guide and social kit. The client
opens `/s/<token>` and sees the stamps.

Terminology: engagement, deliverable, status, share link, revocation.

Questions:
- Who is the buyer?
- What does the client see?
- What does the client not see?

Common misunderstandings:
- Thinking the client can comment or approve. They cannot. The page reads only.
- Thinking multiple clients share one project. They do not.

## Part 3. Understand the customer problem

Simple: delivery status is scattered, the client asks "where are we?", and the answer is
two days old.

Technical: no single source of truth, permissions are managed per project per client,
updates are manual and asynchronous.

Real example: a studio with five clients, each with a Notion page, an email thread and a
spreadsheet. The founder spends a few hours a week reconciling them.

Terminology: source of truth, permissions, reconciliation.

Questions:
- What is the actual pain?
- How does the studio solve it today?
- Why is that solution bad?

Common misunderstandings:
- Assuming the pain is strong enough to pay for. It might not be.
- Assuming clients will open the link. They might not.

## Part 4. Understand the application

Simple: sign up, create a project, add deliverables, edit inline, share a link, revoke
it. Everything saves on the spot.

Technical: REST API over HTTPS, session cookie, Zod validation, prepared statements,
optimistic inline editing with toast confirmation.

Real example: editing a title, blur saves, toast says "Saved". Changing a status from the
select updates the row and the project's updated timestamp.

Terminology: REST, endpoint, mutation, optimistic update, toast.

Questions:
- What does "saves on the spot" mean technically?
- What happens on a failed save?
- How does the empty state behave?

Common misunderstandings:
- Thinking there is a save button. There is not.
- Thinking there is an edit mode. There is not.

## Part 5. Understand the technical architecture

Simple: one Node process, one SQLite file, one port. Browser, Claude and client link all
hit the same origin.

Technical: Express 5, better-sqlite3, WAL mode, Railway volume at `/data`, stateless MCP
endpoint, SPA fallback.

Real example: `POST /mcp` creates a server and transport per request, handles it, closes
both. Nothing is held in memory.

Terminology: process, port, volume, WAL, stateless, SPA.

Questions:
- Why one process?
- Why is the MCP endpoint stateless?
- What would break with two instances?

Common misunderstandings:
- Thinking there is a separate MCP service. There is not.
- Thinking there is a queue or worker. There is not.

## Part 6. Understand the database

Simple: four tables. Users own projects. Projects contain items. Projects have share
links.

Technical: `users`, `projects`, `items`, `share_links`. Foreign keys with cascade. Items
inherit ownership through projects. Schema version 1, applied at boot.

Real example: deleting a user cascades to projects, which cascade to items and share
links.

Terminology: table, row, foreign key, cascade, schema, migration.

Questions:
- How many tables?
- Why no `user_id` on items?
- How does data survive a redeploy?

Common misunderstandings:
- Thinking there is a sessions table. There is not. Sessions are a signed cookie.
- Thinking there is a separate database service. There is not. It is a file.

## Part 7. Understand MCP

Simple: MCP is a standard way for an AI assistant to call functions in an application.
The assistant is the client. The app is the server.

Technical: JSON-RPC 2.0 over Streamable HTTP. The client sends a POST. The server
responds with JSON. Tools are described, then called, then results returned.

Real example: Claude sends `tools/call` with `create_project`. The app writes a row and
returns the project. Claude reads it and replies.

Terminology: JSON-RPC, Streamable HTTP, tool, client, server, initialize, tools/list,
tools/call.

Questions:
- What does MCP do?
- What does MCP not do?
- What is Streamable HTTP?

Common misunderstandings:
- Thinking MCP stores data. It does not. The app stores data.
- Thinking MCP is Claude-specific. It is not. Any client can connect.

## Part 8. Understand the five tools

Simple: five operations. Create a project, add a deliverable, update one, read one, list
them.

Technical: each tool has a Zod schema, a handler bound to the authenticated user, and a
database operation. Status input is normalised. Dates are `YYYY-MM-DD`.

Real example: "Mark the logo as blocked" becomes `update_item` with status "blocked",
normalised to `blocked`, written to the row.

Terminology: schema, handler, normalisation, synonym.

Questions:
- What does each tool do?
- What happens if a tool is called with bad arguments?
- Why is there no delete tool?

Common misunderstandings:
- Thinking the tools are Claude-specific. They are not.
- Thinking a missing record returns a protocol error. It returns `isError: true`.

## Part 9. Understand authentication and security

Simple: web users sign in with email and password and get a signed cookie. MCP clients
send a bearer token. Ownership is checked on every read and write.

Technical: scrypt passwords, HMAC-signed session cookie with 7-day expiry, per-user
bearer tokens stored as SHA-256, Origin check for CSRF, rate limiting on auth endpoints,
cross-user access returns 404.

Real example: a second account trying to read the first account's project gets 404, not
403, so the API does not confirm existence.

Terminology: hash, salt, HMAC, bearer token, CSRF, rate limit, enumeration.

Questions:
- How are passwords stored?
- How is a session verified?
- How is one user prevented from reading another's data?

Common misunderstandings:
- Thinking there is a sessions table. There is not.
- Thinking MCP tokens are stored in plaintext. They are not. Only a hash and a prefix.

## Part 10. Understand deployment and persistence

Simple: the app runs on Railway, one service, one volume, one SQLite file. Data survives
redeploys.

Technical: Dockerfile build, volume at `/data`, `DATABASE_PATH=/data/clientroom.db`,
healthcheck on `/healthz`, managed HTTPS certificate, brief downtime on redeploy.

Real example: `railway redeploy` rebuilt the image, the container restarted, and an
account created before the deploy could still sign in and read its project. 5 of 5
passed.

Terminology: container, volume, redeploy, healthcheck, certificate.

Questions:
- Why Railway and not Vercel?
- What happens on redeploy?
- What happens if the volume dies?

Common misunderstandings:
- Thinking Vercel could host this. It cannot, because its filesystem is ephemeral.
- Thinking there are multiple instances. There are not. One instance, one volume.

## Part 11. Understand testing and validation

Simple: 36 backend tests, 8 browser tests, 44 live acceptance checks, 8 SDK client
checks, 5 persistence checks, a backup and restore rehearsal. All pass.

Technical: Vitest and Supertest for the API, Playwright for the browser, a custom script
for live acceptance, the official SDK client for protocol compliance, gitleaks for
secrets.

Real example: the production check creates its own account, project, deliverables, client
link and MCP credential, then verifies isolation, revocation, credential rotation and the
MCP error model. 44 of 44 pass.

Terminology: unit test, integration test, end-to-end test, acceptance test, regression.

Questions:
- What does each test prove?
- What is not tested?
- Why is the SDK test not a Claude test?

Common misunderstandings:
- Thinking the SDK test proves Claude compatibility. It does not.
- Thinking browser tests cover all browsers. They cover Chromium only.

## Part 12. Understand business economics

Simple: a hypothesis, not a tested business. Free for one project, 15 USD a month for a
solo studio, 40 USD for up to five seats. Infrastructure costs a few dollars a month
because there is no model cost.

Technical: SaaS, monthly subscription, one workspace per account, no variable cost per
user beyond storage.

Real example: the pricing is in the submission package as a hypothesis, with the caveat
that willingness to pay is unvalidated.

Terminology: SaaS, MRR, CAC, LTV, churn, hypothesis.

Questions:
- Why would anyone pay?
- What would make the business fail?
- What is the margin?

Common misunderstandings:
- Presenting the pricing as tested. It is not.
- Claiming customer validation. There is none.

## Part 13. Explain the product in two minutes

Practice this until it is automatic.

"Clientroom is a client delivery workspace for a small design studio. One project per
client engagement, the deliverables inside it, and a read-only link the client can open
without an account.

The studio creates a project, adds deliverables with a status and a due date, and shares
the link. The client sees the current state. When the studio uses Claude, they can ask it
to create a project or update a status, and Claude calls the app's MCP endpoint. The app
saves, stores and keeps it live. The app itself has no AI: no model, no key, no inference
call.

The data is in SQLite on a Railway volume. It survives redeploys. There are 36 backend
tests, 8 browser tests, and 44 live acceptance checks. A real Claude connection has not
been tested, and I am not claiming it.

The business is a hypothesis. The pain might not be strong enough to pay for. I would
rather say that than discover it after."

## Part 14. Defend the product in an evaluator interview

The five hardest questions and how to answer them.

1. "Why not just use Notion?"
   Notion is broader. Clientroom is narrower on purpose: one list per client, one link, no
   client account, no permissions to manage. If the studio finds the narrower thing faster,
   it wins. If not, Notion wins.

2. "Why does this need a separate application?"
   Because the client needs a link with no account and no app install, and the studio
   needs a stable place for status that does not depend on a document's permissions. A
   general tool can do it, but only with setup time per project.

3. "What happens if Claude is unavailable?"
   The app keeps working. Claude is an additional input method, never a dependency. Every
   step works with Claude disconnected.

4. "How do you know the data is actually saved?"
   SQLite on a mounted volume, tested with a real redeploy. 5 of 5 persistence checks
   passed. An account created before the redeploy could sign in after and read its
   project.

5. "What is the difference between an MCP protocol test and a Claude integration test?"
   A protocol test proves the endpoint speaks JSON-RPC correctly. A Claude integration
   test proves Claude can connect, discover tools, call them and act on the results. The
   first is verified. The second is not, and is never claimed to be.

## Self-assessment checklist

- [ ] I can explain the assignment in one sentence.
- [ ] I can explain what the app does and what Claude does.
- [ ] I can name all four tables and their relationships.
- [ ] I can name all five tools and what each does.
- [ ] I can explain the session mechanism and why there is no sessions table.
- [ ] I can explain how MCP authentication works.
- [ ] I can explain the error model and why -32603 is not used.
- [ ] I can explain why SQLite and why not Vercel.
- [ ] I can explain the backup and restore situation honestly.
- [ ] I can explain the pricing hypothesis and that it is untested.
- [ ] I can name three reasons the business might fail.
- [ ] I can say "a real Claude connection has not been tested" without hesitation.
- [ ] I can deliver the two-minute explanation without notes.
- [ ] I can answer the five hardest questions above.
- [ ] I have rehearsed the demo at least three times.
- [ ] I have not claimed any customer interviews, revenue or traction.
- [ ] I have not claimed Claude compatibility.
- [ ] I have not claimed scheduled backups exist on the current plan.
