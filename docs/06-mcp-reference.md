# MCP reference

Clientroom exposes one MCP endpoint, `POST /mcp`, speaking JSON-RPC 2.0 over Streamable
HTTP. It is stateless: no session, no server-side conversation, every request carries its
own bearer token. Responses come back as JSON because the server runs with
`enableJsonResponse`, which is what the SDK needs for a stateless deployment.

## Connecting

1. In the app: Settings, Connect Claude, Create credential. Copy the token now; the app
   keeps only a prefix after you leave the page.
2. In Claude: Settings, Connectors, Add custom connector. Name it Clientroom, paste the
   endpoint, and set the header `Authorization: Bearer <token>`.
3. Ask for something in plain words: "Using Clientroom, create a project called Northwind
   rebrand and add three deliverables: wordmark, brand guide, social kit."

The endpoint URL is shown on the same settings screen, so it is never guessed. The token is
per user. Two people on one workspace would each hold their own credential and each see
only their own projects, because the user id comes from the token, never from the request
body.

Requests must accept JSON, not only `text/event-stream`, if you are testing by hand:

```
Accept: application/json, text/event-stream
Content-Type: application/json
Authorization: Bearer <token>
```

## Tools

Exactly five are registered. There are no delete tools and no share-link tools.

### `create_project`

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `title` | string | yes | 1 to 200 characters after trim |
| `description` | string | no | Internal note, up to 2000 characters, defaults to empty |

Returns `{ project }`.

### `create_item`

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `project_id` | string | yes | Must belong to the caller |
| `title` | string | yes | 1 to 200 characters |
| `status` | string | no | `not_started` (default), `in_progress`, `blocked`, `done` |
| `due_date` | string | no | `YYYY-MM-DD`, omit when there is no date |

Returns `{ item }`. Synonyms such as `in progress`, `In Progress` or `complete` are
normalised before storage, so a model that says "done" or "Done" lands the same place.

### `update_item`

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `id` | string | yes | Must belong to the caller |
| `title` | string | no | |
| `status` | string | no | Same four values |
| `due_date` | string or null | no | `null` clears the date |

At least one of `title`, `status`, `due_date` must be present, otherwise the call fails
with `-32602`. Returns `{ item }`.

### `get_project`

| Field | Type | Required |
| --- | --- | --- |
| `id` | string | yes |

Returns `{ project, items }`. The description is included, because the caller is the owner.

### `list_projects`

Takes no arguments. Returns `{ projects }`, most recently updated first, each with
`item_count` and `done_count`.

Every tool returns its payload as a single `text` content block containing pretty-printed
JSON, which is the shape models read most reliably.

## Errors

Two channels, used for two different kinds of failure.

| Situation | Result |
| --- | --- |
| No `Authorization` header, or an unknown token | HTTP 401, request rejected before JSON-RPC |
| Body is not valid JSON | JSON-RPC error `-32700` |
| Unknown method | JSON-RPC error `-32601` |
| Unknown tool name | JSON-RPC error `-32602` |
| Missing, wrong-typed or out-of-range arguments | JSON-RPC error `-32602`, with a message naming the field |
| `update_item` with no fields | JSON-RPC error `-32602` |
| Project or deliverable does not exist, or belongs to another user | Tool result with `isError: true`, message "not found or unauthorized" |
| `GET /mcp` or `DELETE /mcp` | HTTP 405 with `Allow: POST` |

Argument validation runs before the SDK handler, on purpose. SDK 1.32.2 turns every thrown
error, including `InvalidParams`, into an `isError` tool result, which would tell a model
that the tool ran and failed rather than that the request was malformed. The pre-flight
validator in `src/mcp/validate.ts` puts those errors back in the protocol channel, where
the specification puts them.

Missing records stay in the tool-result channel because they are a normal outcome a model
should read and react to: the project may have been deleted a moment ago.

There is no `-32603` in this server. Earlier notes in `docs/03-architecture.md` mention it
as the fallback; the shipped behaviour is the table above.

## What MCP cannot do

No tool deletes a deliverable, deletes a project, creates a share link, revokes a share
link, or touches the account. Those are the four actions where an agent mistake would be
expensive or public, so they stay in the app behind a click. The trade-off is stated in
[docs/08-limitations.md](08-limitations.md).

## Protocol compliance is not Claude compatibility

The test suite proves the transport behaves: 401 without a token, `initialize`, `tools/list`,
five tools, the five calls, the error codes. A passing MCP Inspector session or a passing
suite does not prove a particular Claude account can reach the endpoint, because that also
depends on the account's connector support, its network access to the host, and its
handling of a bearer header. That check is reported separately and only claimed when it has
actually been run. See [docs/07-test-report.md](07-test-report.md).
