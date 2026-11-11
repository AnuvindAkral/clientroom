# 11. Evaluator Q&A preparation

## Business

**Q: Why this business and not something else?**
A: The assignment asked for a small business that runs on Claude. A design studio's
delivery list is small, structured, and has a clear before and after: the studio knows
what is done, and the client can see it. That is a real workflow with a real owner.

**Q: Who is the customer?**
A: A solo or small design, branding or creative studio, one to eight people. The founder
is the project manager, the account manager and often the designer.

**Q: What is the problem?**
A: Delivery status is scattered across email, Notion and spreadsheets. The client's
question, "where are we?", has no cheap current answer. Keeping the picture current costs
the founder a few hours a week.

**Q: Why would an agency use this instead of Notion?**
A: Notion is broader and more flexible. Clientroom is narrower on purpose: one list per
client, one link, no client account, no permissions to manage. If the studio finds the
narrower thing faster, it wins. If not, Notion wins. That is an honest comparison.

**Q: Why does this need a separate application at all?**
A: Because the client needs a link with no account and no app install, and the studio
needs a stable place for the status that does not depend on a document's permissions. A
general tool can do it, but only with setup time per project. Clientroom removes that.

**Q: What is the strongest reason this business might fail?**
A: The pain may not be strong enough to pay for. Keeping a client informed is annoying,
but it is not always expensive. If a studio can answer the question in thirty seconds by
email, there is no business.

**Q: How would you get the first ten customers?**
A: Direct outreach to studios found through their portfolios, with a short message and a
link to the live app. The goal is conversations, not signups: does the pain exist, and is
the link useful to their clients.

**Q: How would you get the first hundred?**
A: Content and word of mouth. The product has to be good enough that a studio shows it to
another studio. That depends on the client link being genuinely useful, which is the
unvalidated assumption.

**Q: What is the pricing?**
A: A hypothesis, not a tested price: free for one project, 15 USD a month for a solo
studio, 40 USD for up to five seats. Infrastructure is a few dollars a month because
there is no model cost.

**Q: What are the main risks?**
A: The pain is not strong enough to pay for; clients do not open the link; existing
tools are good enough; the MCP connection turns out to be rarely used; one owner per
account limits growth inside a studio.

**Q: Is this validated?**
A: No. Nothing in the submission is based on customer interviews, revenue, usage data or
market research. The idea has not been commercially validated, and I say so.

## Product

**Q: What does a user actually do in the app?**
A: Sign up, create a project, add deliverables with a status and a due date, edit them
inline, create a client link, copy it, revoke it.

**Q: What does the client see?**
A: A single page with the project title, the deliverables, their status stamps and due
dates, and an updated timestamp. No description, no edit controls, no login.

**Q: Can the client edit anything?**
A: No. The client page is read only. Writes return 405 with `Allow: GET`.

**Q: What happens when a link is revoked?**
A: The row is updated and the next request returns 410, "this link is no longer active".
There is no grace period.

**Q: How many links can a project have?**
A: One active link at a time. Creating a second revokes the first. This is deliberate:
several links with labels and per-link expiry is a real feature with a real interface, and
the workflow only needs one link per engagement.

**Q: Can a project be deleted?**
A: No. Project deletion was out of scope. It is a real omission, not a gap I forgot.

**Q: Can two people share one workspace?**
A: No. One owner per account. Two people at the same studio need two accounts and see
separate workspaces. Team seats are a later feature.

**Q: What happens if Claude is unavailable?**
A: The app keeps working. Claude is an additional input method, never a dependency.
Every step in the workflow works with Claude disconnected. The studio can do everything in
the app.

**Q: What happens if the MCP connection fails?**
A: The app is unaffected. The MCP endpoint returns an error to the client, and the data
in the app is unchanged. A failed tool call does not write anything.

## MCP and Claude

**Q: What is MCP?**
A: The Model Context Protocol, an open standard created by Anthropic for connecting AI
applications to tools and data. A remote MCP server is a normal web endpoint that speaks
JSON-RPC 2.0 over HTTP.

**Q: What is a tool?**
A: A named function with a typed input and a structured output. The server describes its
tools. The client, which is the model, decides when to call one. The server executes and
returns a result.

**Q: What are the five tools?**
A: `create_project`, `create_item`, `update_item`, `get_project`, `list_projects`. No
delete tools and no share link tools, because those are decisions a person should make.

**Q: Why only five tools?**
A: The scope is frozen at five. Adding more would be feature creep, and the assignment
asked for a small, focused product. Delete and share are deliberately excluded because
they should be a person's decision.

**Q: What is the difference between an MCP protocol test and a Claude integration test?**
A: A protocol test proves the endpoint speaks JSON-RPC correctly, handles the error model
and executes tools. A Claude integration test proves Claude can connect, discover tools,
call them and act on the results. The first is verified. The second is not, and is never
claimed to be.

**Q: Has Claude been tested?**
A: No. A real Claude account has not been connected. The SDK tests prove protocol
compliance, not Claude compatibility. The steps to run it are documented in
`docs/06-mcp-reference.md`.

**Q: Why is the endpoint stateless?**
A: One server and one transport per request, no session state, no sticky routing. That
makes it deployable on a single instance without a load balancer that remembers
connections, and it matches Railway's constraint of one instance per volume.

**Q: How does authentication work for MCP?**
A: A per-user bearer token, `crm_` plus 32 random bytes, stored as SHA-256. The raw
token is shown once. The app keeps a 12-character prefix for display. Regenerating
replaces the hash and the old token stops working on the next request.

## Architecture

**Q: What is the stack?**
A: Node.js 22, Express 5, SQLite via better-sqlite3, Zod 4, the official MCP SDK, React
19, Vite 6, handwritten CSS, Vitest, Supertest, Playwright. No ORM, no state library, no
component library.

**Q: Why Express?**
A: Stable, small surface, well understood. The app does not need a framework's
abstractions.

**Q: Why React and Vite?**
A: Small bundle, fast build, no framework runtime overhead. The whole app is under 80 kB
gzipped.

**Q: Why handwritten CSS?**
A: Precise control of the visual system. Utility frameworks produce generic output, and
the product's visual identity is a deliberate part of the work.

**Q: How does the frontend talk to the backend?**
A: REST over HTTPS, JSON, session cookie. Vite proxies `/api`, `/mcp`, `/healthz` and
`/s` to the backend in development. In production the backend serves the built assets.

**Q: How does the MCP endpoint talk to the database?**
A: Through the same service layer the REST API uses. The MCP tool handlers call
`createProject`, `createItem` and so on, which use prepared statements against the same
SQLite file. There is no separate data path.

## Database

**Q: How many tables?**
A: Four: `users`, `projects`, `items`, `share_links`. Exactly four, as frozen in the
scope.

**Q: Why no `user_id` on items?**
A: The frozen schema puts ownership on `projects`, and items inherit through their
project. Every item read and write joins `projects.user_id`. This is documented, not
accidental.

**Q: Why SQLite?**
A: The workload is one studio and a few hundred rows. A file plus a volume is simpler to
run, simpler to back up and simpler to reason about than a networked database. The cost
is one instance, which is documented.

**Q: How does data survive a redeploy?**
A: The SQLite file is on a mounted volume at `/data`. Railway stops the old container,
starts the new one against the same volume, and the app opens the same file. The
persistence check proved it: 5 of 5 passed after a real redeploy.

**Q: What happens if the volume dies?**
A: Railway's daily backups restore into a new volume, and the restore procedure is
rehearsed and documented. A file-level copy can also be pulled with `tools/backup.sh`.

**Q: Are there migrations?**
A: One, version 1, applied at boot inside a transaction using `PRAGMA user_version`. The
schema uses `CREATE TABLE IF NOT EXISTS`, so re-running is safe.

## Security

**Q: How are passwords stored?**
A: scrypt with N=16384, r=8, p=1, a 16-byte salt and a 64-byte key. Per-user salt. Stored
as `scrypt$N$r$p$salt$hash`. Verified with a constant-time compare.

**Q: How are sessions managed?**
A: A signed cookie, `cr_session`, carrying the user id and an expiry, signed with
HMAC-SHA256. No sessions table. Seven day expiry, HttpOnly, SameSite=Lax, Secure in
production.

**Q: How is CSRF handled?**
A: SameSite=Lax plus an Origin check on every mutating request. Non-browser clients do
not send Origin, so they pass through.

**Q: How is one user prevented from reading another's data?**
A: Every query filters by the authenticated user id. Cross-user access returns 404, not
403, so the API does not confirm existence. Tested and verified.

**Q: How are share links secured?**
A: 24 random bytes, base64url, stored as SHA-256. Creating a link revokes any previous
active link. Revocation is a row update, effective on the next request. The client page
never exposes the description or any user data.

**Q: Are secrets committed to git?**
A: No. A gitleaks pre-commit hook blocks a commit that stages a likely secret. The only
finding is an ignored scratch file.

**Q: What is logged?**
A: Method, path, status, duration and request id. Never body, token or cookie.

## Deployment and operations

**Q: Where is it hosted?**
A: Railway, single service, SQLite on a mounted volume at `/data`, public HTTPS domain
with a managed certificate.

**Q: Why not Vercel?**
A: Vercel's filesystem is ephemeral. SQLite needs a persistent volume, so Vercel is
used only for preview builds.

**Q: What happens on redeploy?**
A: A few seconds of downtime while the volume remounts. The old container stops, the new
one starts against the same volume. Documented and accepted.

**Q: How are backups done?**
A: Railway daily schedule on the volume, 6-day retention, plus a manual backup before the
first production deploy. Because the workspace is on the Hobby plan, manual backups and
schedules are not available through the platform. A file-level copy can be pulled with
`tools/backup.sh`, and a restore was rehearsed against it.

**Q: What is the healthcheck?**
A: `/healthz` returns 200 only when `SELECT 1` succeeds against the database.

## Limitations

**Q: What is not built?**
A: Password reset, email verification, team seats, file uploads, invoices, time tracking,
notifications, dark mode, internationalisation, link expiry, client comments, project
deletion, bulk actions, undo. Each is a deliberate omission with a reason in
`docs/08-limitations.md`.

**Q: Why no password reset?**
A: It needs outbound email, which needs a provider, a domain and a secret. The evaluator
account is seeded. Password reset is the first thing to add before real customers.

**Q: Why no scheduled backups?**
A: The workspace is on the Hobby plan, which does not support manual or scheduled
backups. The file-level copy and restore rehearsal cover the recoverable half. The
scheduled half needs a Pro upgrade, which is documented and deferred.

**Q: What would you build next?**
A: Password reset with a real email provider, then a second labelled share link per
project, then a read-only access log for links, then team seats once a studio asks.

## Product decisions

**Q: Why no AI in the app?**
A: The assignment put the model on the customer's side. Adding a second model inside the
product would duplicate it, add a key to manage, and make the tool slower for everyone who
does not want it. The app stays a normal web product.

**Q: Why inline editing with no save button?**
A: The product is about keeping a list current. A save button adds a step and a chance
to lose work. Every change saves on the spot and a toast confirms.

**Q: Why four statuses?**
A: `not_started`, `in_progress`, `blocked`, `done`. Four is enough to describe a
deliverable's life without turning into a workflow engine. MCP normalises common synonyms
so a model can say "complete" and land in `done`.

**Q: Why a stamped status instead of a pill?**
A: It is the one visual element people remember, and it is a real piece of the
product's vocabulary. It carries across the app table and the client page.

**Q: Why server-rendered client page?**
A: The client sees content without a second round trip and without a session. It also
returns a real 404 or 410, which a client-side route cannot do honestly.

**Q: Why one share link per project?**
A: The workflow only needs one link per client engagement. Several links with labels and
per-link expiry is a real feature with a real interface, and it was not in scope.
