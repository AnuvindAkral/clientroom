# Submission package: Clientroom

Prepared for the Volopay Founder's Office, Product and Growth assignment.

## 1. What Clientroom is, in plain words

Clientroom is a client delivery workspace for a small design, branding or creative agency.
One project per client engagement, the deliverables inside it, and a read-only link the
client can open without an account.

The agency can create a project, add deliverables with a status and a due date, edit them
inline, add an internal note the client never sees, and share a link. The client reads the
link. They do not create an account, and they cannot change anything.

The second way in is Claude. A studio that uses Claude connects it to Clientroom with a
token, and asks for the same work in a sentence: create a project, add three deliverables,
mark one done. Claude does the thinking and the wording. Clientroom does the saving,
storing and keeping it live. The app itself has no model, no API key, no inference call.
Claude is a second door into the same database, not a feature of the product.

## 2. Business case

### Customer

A small, founder-led design or branding studio, one to eight people, doing client work.
The founder is also the project manager, the account manager and often the designer.

### Problem

The information about a client engagement lives in five places: the email thread, a Notion
page, a shared drive, a Trello board and the invoice. The status of each deliverable is
reconstructed by hand when the client asks, and the answer is usually two days old. The
founder spends a few hours a week keeping that picture current, and the client still does
not trust it.

### Solution

One workspace per engagement, with the deliverables and their statuses in one place, and a
read-only link the client can open any time. The link updates itself, because the data
behind it is the same data the studio edits. When the studio uses Claude, the same
workspace can be driven from a conversation, so a status update takes a sentence instead
of a trip through the app.

### Differentiation

- One workflow, one screen per project. No general purpose workspace, no template gallery,
  no marketplace.
- The client link needs no account and no app. It is a web page.
- MCP is a second door, not a feature. The same five operations are available to a person
  and to an agent, and both write to the same rows.
- The app has no model. No key to manage, no latency, no cost per request, and nothing
  that breaks when a provider changes an API.

### Honest limits

- Studios already use Notion, Google Drive, Trello, ClickUp, HoneyBook or Dubsado. Those
  tools are broader and more familiar. Clientroom is narrower on purpose, which is a
  strength only if the studio finds the narrower thing faster.
- The pain may not be strong enough to pay for. Keeping a client informed is annoying, but
  it is not always expensive. That is an open question, not a claim.
- Clients may not open the link. A link that nobody reads is a feature nobody values.
- Willingness to pay and retention are unproven. Nothing in this submission is based on
  customer interviews, revenue or usage data. The idea has not been commercially validated.

## 3. Assignment compliance

| Requirement | How Clientroom meets it | Evidence |
| --- | --- | --- |
| A real application | Deployed web app with accounts, projects, deliverables, client links, MCP credentials | Live URL, 36 backend tests, 8 browser tests |
| A request from Claude creating or changing something | Five MCP tools create and update real rows | `tools/mcp.test.ts`, 44 live acceptance checks, 8 SDK client checks |
| A user opening and editing that result | Inline editing on the project page, no edit mode, no save button | Browser tests E1 to E12 |
| Persistent, live data | SQLite on a Railway volume at `/data`, survives a real redeploy | 5 of 5 persistence checks after `railway redeploy` |
| No AI inside the application | No model SDK, no API key, no inference call | `npm audit`, dependency read, source read |
| A focused business idea, not a generic AI wrapper | One workflow for one customer type, five tools, six screens | This document, `docs/01-product-brief.md` |

Two things are not yet verified, and are stated as such rather than implied.

- A real Claude account has not been connected. The SDK and Inspector tests prove protocol
  compliance, not Claude compatibility. The connection steps are documented in
  `docs/06-mcp-reference.md` and the endpoint is ready for them.
- Scheduled backups need a Pro workspace on Railway. A manual copy was pulled off the volume
  and a restore was rehearsed against it. That is the recoverable half. The scheduled half
  is open and documented.

## 4. Architecture, in plain words

The app is a Node 22 server with an embedded React front end, one SQLite file on a mounted
volume, and an MCP endpoint on the same origin.

- Authentication on the web is a signed cookie, `cr_session`, with a one week lifetime.
  There is no sessions table. The cookie carries the user id and an expiry, signed with
  `SESSION_SECRET`.
- MCP authentication is a per user bearer token, stored as a SHA-256 hash. The raw token is
  shown once. The app keeps a prefix for display. Regenerating replaces the hash and the
  old token stops working on the next request.
- Ownership is checked on every read and write. A project belongs to a user, a deliverable
  belongs to a project, and both checks run before anything is returned or changed.
- The MCP endpoint is stateless. One server and one transport per request, no session
  state, no sticky routing. That is what makes it deployable on a single instance without
  a load balancer that remembers connections.
- The client link is a token in the URL, stored as a hash, with one active link per
  project. Revocation is immediate. Writes to the link return 405 with `Allow: GET`.
- Errors: HTTP 401 for missing or bad credentials, JSON-RPC `-32700` for a parse error,
  `-32601` for an unknown method, `-32602` for bad arguments, and `isError: true` tool
  results for application errors such as a missing record. There is no `-32603`.

Database tables: `users`, `projects`, `items`, `share_links`. Exactly four.

MCP tools: `create_project`, `create_item`, `update_item`, `get_project`, `list_projects`.
Exactly five. There are no delete tools and no share link tools, because those are decisions
a person should make.

## 5. Five minute pitch

Timings assume a live app on the public origin, signed out, one browser window.

**0:00 to 0:30, overview.**

"This is Clientroom. A design studio signs up, keeps one project per client engagement,
and sends the client a read-only link. The same data can also be driven from Claude
through an MCP endpoint. The app has no AI inside it: no model, no key, no inference
call."

Say the last sentence plainly. It is the requirement most submissions fail.

**0:30 to 1:00, sign up.**

Open the app, sign up with a fresh email and password. The empty workspace shows a focused
form, because naming the first project is the only thing to do. Type a client name, for
example "Northwind rebrand", and submit.

**1:00 to 2:30, the project.**

Add three deliverables in the row under the table: wordmark, brand guide, social kit. Set
one to done, one to in progress. Put a due date on one, in the past, and note that it turns
red. Then edit a title in place and change a status.

"Everything on this page saves on the spot. No edit mode, no save button, no modal."

Add an internal note with the "Add one" control. "The client never sees this line."

**2:30 to 3:30, the client link.**

Click Client link, create it, copy it. Open it in a private window. "No account, no sign
in. This is what the client sees: the project title and the deliverables with their
statuses."

Switch back, revoke the link, reload the private window. "410. Access stops on the next
load, which is the point of revocation."

**3:30 to 4:30, Claude.**

Settings, Connect Claude. Show the three numbered steps. Create a credential, and point
out that the token is shown once and only a prefix is kept afterwards.

In Claude, ask for something concrete: "Using Clientroom, add a deliverable called print
pack to Northwind rebrand, due 20 November, status blocked." Come back to the app, reload,
and the row is there.

"Five tools: create a project, add a deliverable, update one, read one, list them.
Deleting and sharing are not tools, because those should be a person's decision."

If a live Claude account is not available, show the endpoint answering instead: a `POST`
to `/mcp` with the token, `tools/list` returning five tools. Say that protocol compliance
is verified and that a real Claude connection is not, rather than implying both.

**4:30 to 5:00, close.**

"The interesting decisions were the boring ones. SQLite on a volume, so a studio's data is
one file that can be backed up and restored. A signature check on the cookie instead of a
sessions table. One share link per project. And a hard line between what a person does and
what an agent may do."

Then hand over: the URL, the demo credentials, the MCP endpoint, and the document list.

## 6. Live demo narration

Run order matters. Create the project and the deliverables first, so by the time the client
link and Claude are shown there is something real on screen.

- Sign in with the demo account, or create a fresh one on the live origin.
- Create a project named "Northwind rebrand".
- Add three deliverables: wordmark, brand guide, social kit. Set statuses and a past due
  date to show the red highlight.
- Edit a title in place and change a status, to show there is no save button.
- Add an internal note, then open the client link in a private window to show the note is
  absent and the account email is absent.
- Revoke the link and reload to show 410.
- Open Settings, Connect Claude, create a credential, point at the prefix-only display.
- If Claude is connected, run the live request and reload the app to show the row.
- If not, run the endpoint request and say so.

## 7. Business model, pricing and growth

### Pricing hypothesis

- Free: one project, one client link, no MCP. Enough to feel the product.
- Solo at 15 USD per month: unlimited projects, client links, MCP connection.
- Studio at 40 USD per month: up to five seats, shared workspace, link audit log.

These are hypotheses, not prices that have been tested.

### Growth

- Start with solo founders and freelancers who already use Claude, because the MCP door
  is the hook that makes Clientroom different from a Notion template.
- Content that shows a real workflow: a video of "create a project and three deliverables
  in one sentence" is the whole pitch in twenty seconds.
- No paid acquisition until retention is measured. The first question is whether a studio
  opens the app a second week.

### What would make it fail

- The pain is not strong enough to pay for.
- Clients do not open the link, so the shared view is unused.
- The studio's existing tools are good enough and switching costs are high.
- The MCP connection, which is the differentiator, turns out to be rarely used.

## 8. Submission email

Subject: Clientroom: a client delivery workspace that runs on Claude via MCP

Hello,

I am submitting Clientroom, a small product I built for the assignment.

Clientroom is a client delivery workspace for a small design or branding studio. A studio
keeps one project per client engagement, tracks the deliverables and their statuses, and
sends the client a read-only link that needs no account. The same data can also be driven
from Claude through an MCP endpoint. The app itself has no model, no API key and no
inference call.

Live app: https://clientroom-production.up.railway.app
MCP endpoint: https://clientroom-production.up.railway.app/mcp
Repository: https://github.com/AnuvindAkral/clientroom
Demo account: demo@clientroom.app / clientroom-demo-2026

The demo account holds one fabricated sample project with four deliverables and is safe to
edit. Its MCP credential is not published; one can be created from Settings in a minute.

The README and the documents in `docs/` cover the product, the architecture, the MCP
reference, the operations runbook, the test report and the limitations. The five minute
demo script is `docs/demo-script.md`.

On Claude compatibility: the endpoint passes 44 of 44 production acceptance checks and 8
of 8 checks with the official MCP SDK client over Streamable HTTP, and data survives a
real redeploy. A connection from an actual Claude account has not yet been run, and I have
not claimed it. The steps to run it are in `docs/06-mcp-reference.md`.

Thank you for the assignment. I enjoyed the constraint of putting the model on the
customer's side and keeping the application boring.

Best,
Anuvind

## 9. Final checklist before sending

- [ ] Claude connection tested on a Free account, or the submission states plainly that it
      has not been
- [ ] Five minute pitch recorded against the live app
- [ ] Demo account password rotated if it was used for testing
- [ ] MCP credential created and then revoked for any test account, so no live token sits
      in a screenshot or a recording
- [ ] README links and credentials double checked on the live origin
- [ ] `docs/07-test-report.md` numbers match the last run
- [ ] Pitch does not claim customer interviews, revenue, traction or a verified Claude
      connection
- [ ] Submission email sent with the URL, endpoint, credentials and document list
- [ ] Recruiter contacted only after the above are done

## 10. Sources of truth

- Product and scope: `docs/01-journeys-and-screens.md`
- Acceptance criteria and evidence: `docs/02-acceptance-and-traceability.md`
- Architecture: `docs/03-architecture.md`
- Implementation checklist: `docs/04-implementation-checklist.md`
- Operations and backups: `docs/05-operations.md`
- MCP reference and connection steps: `docs/06-mcp-reference.md`
- Test report: `docs/07-test-report.md`
- Limitations: `docs/08-limitations.md`
- Demo script: `docs/demo-script.md`
- This package: `docs/09-submission.md`
