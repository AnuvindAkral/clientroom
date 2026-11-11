# 01. Original assignment breakdown

## What Volopay asked for

The assignment is to build a small business that runs on Claude, with no AI inside the
application. A customer connects their own Claude to the app through MCP. Claude handles
thinking and writing. The application handles saving, editing, storing and keeping the
result live.

The evaluator wants a real application, not a demo. They want to see a request from Claude
creating or changing something, a user opening and editing that result, persistent live
data, no AI APIs or model integrations inside the app, and a focused business idea rather
than a generic AI wrapper.

Required deliverables: a five minute pitch, a live application URL, test credentials, an
MCP endpoint, and simple connection instructions.

## Why Claude and MCP

MCP is the Model Context Protocol, an open standard created by Anthropic for connecting
AI applications to tools and data. A remote MCP server is a normal web endpoint that speaks
JSON-RPC. The AI assistant is the client. The application is the server.

The point of the assignment is the separation. The model thinks. The application stores.
Putting the model inside the app would duplicate it, add a key to manage, and make the tool
slower for anyone who does not want AI. Putting it on the customer's side means the
customer pays for and controls their own model, and the app stays a normal web product.

## What "no AI inside the app" means

- No model SDK in the dependency tree.
- No API key for an inference provider.
- No outbound call to a model at request time.
- No background job that calls a model.
- No prompt template, no embedding, no vector store.

Clientroom satisfies this. `package.json` has no model dependency. The only network calls
the app makes are its own. `npm audit` reports zero vulnerabilities and no model package.

## What the application is responsible for

- Accounts and sessions.
- Projects and deliverables, with ownership.
- Status vocabulary and normalisation.
- Read-only client links and revocation.
- Per-user MCP credentials, hashed at rest.
- Persistent storage that survives redeploys.
- The MCP endpoint itself, which is just a JSON-RPC endpoint with five tools.

## What Claude is responsible for

- Understanding what the user wants.
- Deciding which tool to call and with what arguments.
- Turning a sentence into structured data.
- Explaining the result back to the user.

Claude never writes to the database. It asks the app to, through MCP, and the app decides
whether the request is allowed.

## Why persistent storage matters

If the data disappears when the container restarts, the app is a toy. The assignment
specifically wants live data that survives. Clientroom stores everything in one SQLite file
on a mounted Railway volume, and the persistence check proves the file is still there after
a real redeploy.

## What the evaluator is likely looking for

1. Does the app actually work, or is it a prototype?
2. Can a request from an AI assistant create or change a real record?
3. Can a human open and edit that record?
4. Does the data survive?
5. Is there any AI hidden inside the app?
6. Is the business idea focused, or is it a generic AI wrapper?
7. Can the candidate explain what they built and why?

## Required deliverables and where they are

| Deliverable | Where it lives |
|---|---|
| Five minute pitch | `docs/09_FIVE_MINUTE_PITCH.md` and `docs/demo-script.md` |
| Live application URL | https://clientroom-production.up.railway.app |
| Test credentials | `demo@clientroom.app` / `clientroom-demo-2026` |
| MCP endpoint | https://clientroom-production.up.railway.app/mcp |
| Connection instructions | `docs/06-mcp-reference.md` and `docs/12_SUBMISSION_PACKAGE.md` |

## Requirement to implementation mapping

| Assignment requirement | Clientroom implementation | Evidence |
|---|---|---|
| Real application | Deployed web app with accounts, projects, deliverables, client links, MCP credentials | Live URL, 36 backend tests, 8 browser tests |
| Request from Claude creating or changing something | Five MCP tools create and update real rows | `tests/mcp.test.ts`, 44 live acceptance checks, 8 SDK client checks |
| User opening and editing that result | Inline editing on the project page, no edit mode, no save button | Browser tests E1 to E12 |
| Persistent, live data | SQLite on a Railway volume at `/data` | 5 of 5 persistence checks after `railway redeploy` |
| No AI inside the application | No model SDK, no API key, no inference call | `npm audit`, dependency read, source read |
| Focused business idea, not a generic AI wrapper | One workflow for one customer type, five tools, six screens | `docs/00-product-requirements.md` |

## One thing that is not verified

A real Claude account has not been connected to the endpoint. The SDK tests prove protocol
compliance, not Claude compatibility. The connection steps are documented in
`docs/06-mcp-reference.md`. This is stated in the submission package rather than implied.
