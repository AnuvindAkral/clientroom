# 06. MCP complete technical guide

## What MCP is

MCP is the Model Context Protocol, an open standard created by Anthropic for connecting
AI applications to tools and data. A remote MCP server is a normal web endpoint that
speaks JSON-RPC 2.0 over HTTP. The AI assistant is the client. The application is the
server.

MCP exists so that an AI assistant can do real work in real systems without the assistant
and the system being built by the same company. The protocol is the contract between them.

## Why it exists

Before MCP, every AI assistant that wanted to read or write data needed a custom
integration for every system. MCP standardises the shape of that integration: how tools
are described, how they are called, how results come back, and how errors are reported.

## What a tool is

A tool is a named function with a typed input and a structured output. The server
describes its tools to the client. The client, which is the model, decides when to call
one based on what the user asked. The server executes the call and returns a result the
model can read.

## What an MCP client is

The client is the AI assistant. Claude is the client here. It reads the tool
descriptions, decides which to call, sends the request, reads the result, and explains it
to the user. The client never touches the database directly.

## What an MCP server is

The server is the application. Clientroom is the server. It holds the tools, enforces
ownership, writes to the database, and returns results. It does not think. It does not
choose which tool to call. It answers.

## What JSON-RPC is

JSON-RPC 2.0 is a simple protocol for calling functions over JSON. A request has a
`jsonrpc` version, an `id`, a `method` name and `params`. A response has the same `id`
and either a `result` or an `error`. It is stateless at the protocol level and works over
any transport.

## What Streamable HTTP means

Streamable HTTP is the transport MCP uses for remote servers. The client sends a POST
with the request. The server responds, either as a single JSON document or as a stream of
server-sent events. Clientroom uses `enableJsonResponse: true`, so it always responds
with a single JSON document. This removes any dependency on long-lived connections
through Railway's edge.

## How Claude connects to a remote MCP server

1. The user adds a custom connector in Claude, with the server URL and, for
   Clientroom, a request header carrying the bearer token.
2. Claude connects from Anthropic's cloud infrastructure, not from the user's device.
3. Claude discovers the tools by calling `tools/list`.
4. When the user asks for something, Claude decides which tool to call and sends
   `tools/call`.
5. The server executes and returns a result. Claude reads it and responds to the user.

The connection must be reachable over the public internet from Anthropic's IP ranges.
Clientroom is, because it runs on Railway's public domain.

## Clientroom's implementation

### Transport and lifecycle

`POST /mcp` with `Authorization: Bearer`. A server and transport pair is created per
request. No session state is held in memory. No sticky routing is required. `GET /mcp`
and `DELETE /mcp` return 405 with `Allow: POST`.

### Authentication

The bearer token is the user's MCP credential. `authenticateMcpRequest` hashes it with
SHA-256, looks up the user, then re-reads the user row so a revoked credential cannot
resolve through a stale row. A missing or invalid token returns HTTP 401 with
`WWW-Authenticate: Bearer`.

### Validation

`validateToolCall` runs before the SDK handler. If the request is a `tools/call`, the
tool name must exist and the arguments must pass Zod. A failure returns a JSON-RPC
`-32602` with a readable message. This keeps invalid arguments in the protocol error
channel instead of becoming tool results.

### Tool registration

Five tools are registered with the MCP SDK, each with an input schema derived from the
shared Zod validators. Each handler is bound to the authenticated user, so the user id
never comes from the request body.

### Error model

Protocol misuse returns JSON-RPC errors: `-32700` for a parse error, `-32601` for an
unknown method, `-32602` for bad arguments. Application errors, such as a missing
record, return `isError: true` with a readable message. The model can read that and act
on it.

## The five tools

### create_project

Purpose: create a client delivery project for the signed-in studio.

Input:
- `title` (string, required, 1 to 200 characters after trim)
- `description` (string, optional, 0 to 2000 characters, defaults to empty)

Example request:
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "create_project",
    "arguments": { "title": "Acme brand refresh", "description": "Q4 work" }
  }
}
```

Example response:
```json
{
  "result": {
    "content": [{ "type": "text", "text": "{\n  \"project\": {\n    \"id\": \"...\",\n    \"title\": \"Acme brand refresh\",\n    \"description\": \"Q4 work\",\n    \"status\": \"active\",\n    \"created_at\": \"...\",\n    \"updated_at\": \"...\"\n  }\n}" }]
  }
}
```

Database operation: inserts a row into `projects` with `status = 'active'`.

Errors: invalid title returns `-32602`. Missing authentication returns 401.

Natural language example: "Create a project for Acme called brand refresh."

### create_item

Purpose: add a deliverable to an existing project.

Input:
- `project_id` (string, required, must belong to the caller)
- `title` (string, required, 1 to 200 characters)
- `status` (string, optional, one of `not_started`, `in_progress`, `blocked`, `done`,
  defaults to `not_started`)
- `due_date` (string, optional, `YYYY-MM-DD`)

Example request:
```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/call",
  "params": {
    "name": "create_item",
    "arguments": {
      "project_id": "proj_123",
      "title": "Logo",
      "status": "done",
      "due_date": "2026-11-12"
    }
  }
}
```

Example response: returns the created item with its id.

Database operation: inserts a row into `items`, then touches the project's
`updated_at`.

Errors: unknown project returns `isError: true`. Invalid status returns `-32602`. Missing
`project_id` returns `-32602`.

Natural language example: "Add a deliverable called Logo to Acme, due 12 November, status
done."

### update_item

Purpose: change a deliverable title, status or due date. Send only the fields that
change.

Input:
- `id` (string, required, must belong to the caller)
- `title` (string, optional, 1 to 200 characters)
- `status` (string, optional, one of the four, with synonym normalisation)
- `due_date` (string or null, optional, `YYYY-MM-DD` or null to clear)

Example request:
```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "method": "tools/call",
  "params": {
    "name": "update_item",
    "arguments": { "id": "item_456", "status": "blocked", "due_date": "2026-11-20" }
  }
}
```

Example response: returns the updated item.

Database operation: updates the item row, touches the project's `updated_at`.

Errors: unknown item returns `isError: true`. Sending no fields returns `-32602`. Invalid
status returns `-32602`.

Natural language example: "Mark the logo as blocked and move it to 20 November."

### get_project

Purpose: read one project and all of its deliverables.

Input:
- `id` (string, required)

Example request:
```json
{
  "jsonrpc": "2.0",
  "id": 4,
  "method": "tools/call",
  "params": { "name": "get_project", "arguments": { "id": "proj_123" } }
}
```

Example response:
```json
{
  "result": {
    "content": [{ "type": "text", "text": "{\n  \"project\": { ... },\n  \"items\": [ { ... } ]\n}" }]
  }
}
```

Database operation: reads the project joined to its items, ordered by due date.

Errors: unknown or unowned project returns `isError: true`.

Natural language example: "Show me the Acme project."

### list_projects

Purpose: list every project for the signed-in studio, most recently updated first.

Input: none.

Example request:
```json
{
  "jsonrpc": "2.0",
  "id": 5,
  "method": "tools/call",
  "params": { "name": "list_projects", "arguments": {} }
}
```

Example response: returns an array of projects with `item_count` and `done_count`.

Database operation: reads projects for the user with correlated counts.

Errors: none beyond authentication.

Natural language example: "What projects do I have?"

## End to end sequence: a sentence becomes a saved project

1. The user types in Claude: "Create a project for Acme called brand refresh, with
   deliverables logo, brand guide and social kit."
2. Claude calls `create_project` with title "Acme brand refresh". The app writes a row and
   returns the project id.
3. Claude calls `create_item` three times, once per deliverable, with the project id.
   The app writes three rows and touches the project's `updated_at`.
4. Claude calls `get_project` to read back what it created.
5. Claude replies to the user with a summary.
6. The studio opens Clientroom in a browser and sees the project and the three
   deliverables, because they are in the same database.

## What MCP does and does not do

MCP does:
- Describe tools to the client.
- Carry a request from the client to the server.
- Carry the result back.
- Report errors in a standard shape.

MCP does not:
- Think or decide which tool to call.
- Store data. The app stores data.
- Authenticate the user beyond carrying the bearer token.
- Guarantee the client is Claude. Any MCP client can connect.

## Status normalisation

The MCP status schema accepts common synonyms and normalises them before storage. "Complete",
"completed", "finished", "shipped" all become `done`. "In progress", "in_progress", "doing",
"wip" all become `in_progress`. "On hold", "waiting", "stuck" become `blocked`. "Todo",
"pending", "open" become `not_started`. Invalid values are rejected with the allowed list.

## What is not a tool

There is no delete tool and no share link tool. Deleting a deliverable and creating a share
link are decisions a person should make, so they are only available in the app. This is a
deliberate scope choice, not a gap.
