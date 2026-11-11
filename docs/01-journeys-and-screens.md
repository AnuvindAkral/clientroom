# Clientroom - Journeys and Screen Specification

---

## 1. Journey map

### J1. First run (studio owner)

| Step | Surface | What they see | What they do | System response |
|---|---|---|---|---|
| 1 | `/signup` | Two fields, one button | Enter email and password | Account created, session set, redirect to `/` |
| 2 | `/` | The create form is already open and focused, with one lead line naming what a project holds | Name the first client project | Project created, open `/projects/:id` |
| 3 | `/projects/:id` | Empty deliverable list with an inline add row | Add three deliverables | Rows persist, "Saved" toast |
| 4 | `/projects/:id` | Share panel closed | Click "Client link" | Link created, URL shown with Copy and Open |
| 5 | `/settings/claude` | Credential not created | Click "Create credential" | Token revealed once, copy button, warning it cannot be shown again |

Failure paths: weak password (< 8 chars) shows the rule before submit; duplicate
email returns "That email already has an account" with a link to sign in.

### J2. Claude creates work (studio owner, Claude connected)

| Step | Surface | What happens |
|---|---|---|
| 1 | Claude | Owner: "Create a project for Acme, brand refresh: logo, brand guide, social kit" |
| 2 | MCP | `create_project` returns id, then three `create_item` calls |
| 3 | `/` | Acme appears in the list without a refresh if open in another tab on next poll/focus |
| 4 | `/projects/:id` | Three deliverables with Not started |
| 5 | Claude | Owner: "Mark the logo done" |
| 6 | MCP | `update_item` with status normalised to `done` |
| 7 | `/projects/:id` | Row shows Done after focus refetch |

### J3. Human edits what Claude made

Owner signs in, opens the project, changes a due date inline, renames a
deliverable, changes status. Each change persists and updates `updated_at`.

### J4. Client views progress

| Step | Surface | What they see |
|---|---|---|
| 1 | Link from studio | `/s/:token`, no login |
| 2 | Client page | Studio name, project title, deliverables with status stamps and dates, "Updated 11 Nov 2026" |
| 3 | Client page | No description, no edit controls, no account prompts |

### J5. Studio revokes access

Owner opens the share panel, clicks Revoke, confirms. The panel shows "Link
revoked" and offers a new link. The client's next request gets the revoked page
with HTTP 410.

### J6. Credential compromise

Owner opens `/settings/claude`, clicks Regenerate, confirms. The old token stops
working on the next MCP request (401). The new token is revealed once.

---

## 2. Screen specification

### 2.1 `/login` and `/signup`

```
+----------------------------------------------------------+
|  Clientroom                                    [Sign in] |
|                                                          |
|   Client delivery, in one room.                          |
|   One list per client. One link to share.                |
|                                                          |
|   +--------------------------------------------------+   |
|   | Email                                            |   |
|   +--------------------------------------------------+   |
|   | Password                                         |   |
|   +--------------------------------------------------+   |
|   [ Sign in ]                                            |
|   New here? Create an account                            |
+----------------------------------------------------------+
```

- Single column, max 420px, vertically centred, left aligned text.
- Errors inline under the field, never in a toast.
- Submit disabled only while the request is in flight; otherwise the server
  decides.
- Autofocus email. Enter submits. Password reveal toggle with accessible label.

### 2.2 `/` Project list

```
+----------------+-------------------------------------------+
| Clientroom      | Projects                    [New project]|
|                |                                           |
| Acme           | +---------------------------------------+ |
| Northwind      | | Acme                                  | |
|                | | Brand refresh                         | |
|                | | 6 deliverables · 2 done · updated 2h  | |
|                | +---------------------------------------+ |
| Settings       | +---------------------------------------+ |
|                | | Northwind                             | |
|                | | ...                                   | |
+----------------+-------------------------------------------+
```

- Left rail 232px: wordmark, project links (ordered by `updated_at`), Settings.
- Main: page title, "New project" button opening an inline form (title,
  optional description), then project rows.
- Row: title, description one line, counts and relative updated time.
- Empty workspace: the form is the empty state. It opens and focuses itself, carries one
  lead line, and the Cancel button is hidden because there is nothing to cancel back to.
- With projects present: the list, then one footnote with the workspace count.
- Mobile: the rail becomes a two row header, brand and account on the first line, the
  project links under it.

### 2.3 `/projects/:id`

```
+----------------+-------------------------------------------+
| Clientroom      | Acme                        [Client link]|
|                | Brand refresh · 6 deliverables            |
| Acme      •    |                                           |
| Northwind      | Deliverable            Status      Due     |
|                | -----------------------------------------  |
|                | Logo                   [Done    v]  12 Nov  |
|                | Brand guide            [In prog v]  18 Nov  |
|                | Social kit             [Not st. v]  --      |
|                | + Add deliverable                          |
|                |                                           |
|                | (share panel, when open)                  |
+----------------+-------------------------------------------+
```

- Title and description editable in place. Click to edit, blur or Cmd+Enter to
  save, Escape to cancel. Saving state is a subtle underline pulse, not a modal.
- Deliverable row: title input (borderless until focus), status select, date
  input, remove button on hover/focus.
- Overdue dates render in the danger colour when status is not Done.
- "+ Add deliverable" appends a focused empty row; Enter saves, Escape cancels.
- Share panel opens under the header button: if no active link, a "Create
  client link" action; if active, the URL, Copy, Open, and Revoke.
- Revoke asks for confirmation inline: "Revoke this link? The client will lose
  access." with Revoke and Cancel.
- The last updated timestamp is visible but quiet.
- Loading: skeleton rows matching final layout.
- Error: a single inline banner with Retry, keeping current data.

### 2.4 `/settings/claude`

```
+----------------+-------------------------------------------+
| Clientroom      | Connect Claude                            |
|                |                                           |
| ...            | 1. Create a credential                    |
|                |    [Create credential]                    |
|                |                                           |
|                | 2. Add a custom connector in Claude        |
|                |    URL: https://app.example/mcp            |
|                |    Header: Authorization: Bearer <token>   |
|                |                                           |
|                | 3. Ask Claude to create a project          |
|                |    "Create a project for Acme..."          |
+----------------------------------------------------------+
```

- No credential: one button. After creation: token shown once in a read-only
  field with Copy and a warning, plus the three-step instructions.
- Existing credential: prefix (`crm_7f3a…`), created date, Regenerate, Revoke.
- Regenerate and Revoke confirm inline.
- Connection URL is rendered from the app's public origin, copyable.
- A short "Test it" line shows a copyable prompt.

### 2.5 `/s/:token` Client view

```
+----------------------------------------------------------+
|  ACME                                    Shared by Studio |
|  Brand refresh                                           |
|  Updated 11 Nov 2026                                     |
|                                                          |
|  Logo                                DONE        12 Nov   |
|  Brand guide                    IN PROGRESS       18 Nov   |
|  Social kit                    NOT STARTED          --     |
|                                                          |
|  Read only. No account needed.                           |
+----------------------------------------------------------+
```

- Max 720px, generous leading, print-like calm. This page is the product's
  public face and gets the most design attention.
- Status rendered as a stamped word (uppercase mono, hairline border), not a
  filled pill.
- No studio editing controls, no login prompt, no description.
- Revoked or unknown token: "This link is no longer active" with HTTP 410 for
  revoked and 404 for unknown. No hint about which.
- `noindex, nofollow`. No analytics.

---

## 3. Component inventory

| Component | Used on | Notes |
|---|---|---|
| `AppShell` | App routes | Rail, main, skip link |
| `AuthCard` | Login, signup | Shared form shell |
| `ProjectRow` | `/` | Link with meta line |
| `NewProjectForm` | `/` | Inline, collapsible |
| `EditableText` | Detail | Input styled as text, save on blur |
| `StatusSelect` | Detail | Native select styled, keyboard safe |
| `DateField` | Detail | Native date input, clearable |
| `DeliverableRow` | Detail | Grid row, responsive stack |
| `SharePanel` | Detail | Create, copy, open, revoke |
| `CredentialPanel` | Settings | Reveal once, regenerate, revoke |
| `Toast` | App | Bottom left, 4s, one at a time |
| `EmptyState` | `/`, detail | One line plus action |
| `Skeleton` | App | Matches final layout |
| `ClientHeader` | Share | Studio and project identity |
| `ClientRow` | Share | Read-only deliverable |
| `ErrorPage` | 404, 410 | Plain, no chrome |

## 4. Visual system

**Direction:** a studio job sheet. Print-shop utilitarianism, not a SaaS
dashboard. Hairline rules, tabular numbers, stamped statuses, one spot colour.

| Token | Value | Use |
|---|---|---|
| `--paper` | `#F6F5F0` | App background |
| `--surface` | `#FFFFFF` | Rows, panels |
| `--ink` | `#17170F` | Primary text |
| `--muted` | `#6E6C61` | Secondary text |
| `--rule` | `#DAD7CB` | Hairlines |
| `--spot` | `#1F3FD8` | Primary action, focus, active link |
| `--danger` | `#A3241B` | Overdue, destructive |
| `--done` | `#2C5E3F` | Done stamp |

Type: IBM Plex Sans Condensed 600 for display and page titles, IBM Plex Sans
400/500 for body, IBM Plex Mono 500 for statuses, dates, counts and IDs.
Self-hosted, subset, `font-display: swap`.

Layout: 12-column grid, 8px spacing scale, max content 1080px, page padding
32px desktop, 20px mobile. Radius 2px. Shadows only on the share panel, one
level. No gradients, no glow, no glass.

**Signature:** the status stamp. A word set in mono uppercase inside a hairline
box, colour-coded only by text and border, stamped across the client page and
the app table. It is the one element people remember, and it is a real piece of
the product's vocabulary.
