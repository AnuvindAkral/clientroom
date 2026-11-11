# Clientroom - Product Requirements (Frozen)

**Assignment:** Volopay Founder's Office, Product & Growth
**Product decision:** O3, client engagement workspace
**Status:** Frozen. No feature outside this document ships.

---

## 1. The product

Clientroom is a client delivery workspace for small design studios.

A studio keeps one structured list of deliverables per client. The client opens
a private link and sees the current state of that list without an account, an
app install, or a permission dialog. The studio can update the list in the app
or ask Claude to update it through MCP.

**One sentence:** the studio's delivery list, always current, visible to the
client without a login.

## 2. Who it is for (hypothesis, not validated)

| Attribute | Value | Evidence |
|---|---|---|
| Segment | Solo and small design studios, 1 to 8 people | Proposed ICP, unvalidated |
| Concurrent clients | 3 to 8 | Proposed ICP, unvalidated |
| User and buyer | Studio founder or account lead | Assumption |
| Today | Notion pages, email threads, spreadsheets | Verified complaints, not verified spend |
| Pain | Clients ask for status; sharing needs permissions or accounts | Verified complaints |

Willingness to pay, link adoption and retention are unvalidated hypotheses.
Nothing in the product or its copy may claim otherwise.

## 3. The problem

A studio's delivery status lives in the studio's head, in email, or in a Notion
page whose permissions someone has to manage. The client's question ("where are
we?") has no cheap, current answer. Building a client-facing view in a general
tool costs setup time per project and a login per client.

Clientroom removes both costs: one list per client, one link, no client account.

## 4. Scope

### In scope (P0)

1. Email and password accounts, one workspace per user.
2. Create, rename and describe projects.
3. Create, edit, reorder-by-date and delete deliverables inside a project.
4. Change deliverable title, status and due date.
5. Create a read-only share link per project; copy it; open it.
6. Revoke a share link; revoked links stop working immediately.
7. Public client page with no authentication.
8. Five MCP tools: `create_project`, `create_item`, `update_item`,
   `get_project`, `list_projects`.
9. Per-user MCP credential: generate, reveal once, regenerate, revoke.
10. Persistent storage that survives redeploys.
11. Public HTTPS app and MCP endpoint.

### Out of scope (do not build)

- Client accounts, client comments, client approvals or sign-off
- Multiple clients per project
- Team members, roles, invitations, multiple users per workspace
- Email or push notifications
- Custom domains, logo upload, white labelling
- Files, attachments, images
- Invoices, contracts, time tracking, budgets
- Milestones, Gantt, calendar, dependencies
- Search, filters, tags, sorting controls
- Activity feeds, audit logs exposed to users
- Project deletion, archiving, templates, duplication
- Share link expiry (P2, deferred)
- Any AI call, model SDK, API key or background inference inside the app
- Any MCP tool beyond the five above
- Billing, plans, trials, paywalls

## 5. The five-step workflow

1. The studio signs in.
2. It creates a project, in the app or by asking Claude.
3. It adds deliverables, in the app or by asking Claude.
4. It updates status and dates, in the app or by asking Claude.
5. It shares the link with the client and revokes it when the engagement ends.

Every step must work with Claude disconnected. Claude is an additional input
method, never a dependency.

## 6. Screens

| Route | Purpose | Auth |
|---|---|---|
| `/login` | Sign in | Public |
| `/signup` | Create an account | Public |
| `/` | Project list, create project, empty state | Session |
| `/projects/:id` | Project detail, deliverables, share controls | Session, owner only |
| `/settings/claude` | MCP credential and connection instructions | Session |
| `/s/:token` | Client view, read only | Public, valid token |
| `/s/:token` revoked | Clear "link revoked" state | Public |
| `*` | Not found | Public |

## 7. Interaction rules

- Every mutation returns a result the user can see: inline state change plus a
  short toast. No silent writes.
- Saves are optimistic only where the failure is recoverable; on failure the
  previous value returns and an inline error explains what happened.
- Empty states name the next action.
- Loading states use layout-stable skeletons, not spinners on full pages.
- Errors say what failed and what to do. They do not apologise.
- Destructive actions confirm once, in place. No modal stack.
- Keyboard: every control reachable by Tab, visible focus ring, Escape closes
  the share panel.
- Reduced motion respected; no animation longer than 200ms.
- Mobile down to 360px: the rail collapses, the table becomes stacked rows.

## 8. Status vocabulary

Four statuses, one canonical set: `not_started`, `in_progress`, `blocked`,
`done`. Labels: Not started, In progress, Blocked, Done.

MCP accepts common synonyms (`complete`, `completed`, `todo`, `in progress`,
`on hold`) and normalises them. Invalid values are rejected with the allowed
list.

## 9. Security and isolation

- Every project belongs to exactly one user. Every read and write is scoped by
  the authenticated user id, never by a client-supplied user id.
- Cross-user access returns the same message as a missing record, so the API
  does not confirm existence.
- MCP credentials are per user, hashed at rest, shown once, revocable.
- Share links are read only, high entropy, stored hashed, revocable.
- The client view never exposes the project description or any user data.
- Passwords use scrypt with a per-user salt. Sessions are signed, HttpOnly,
  SameSite=Lax, Secure in production.
- No secret is logged. The MCP token and password never appear in responses
  after creation or in any log line.

## 10. Non-functional requirements

| Requirement | Target |
|---|---|
| Cold page load | Under 2s on a normal connection |
| App JS payload | Under 250KB gzipped |
| API response | Under 300ms at p95 for single-record operations |
| Accessibility | WCAG 2.2 AA for the app and the client page |
| Persistence | Survives redeploy and restart |
| Backup | Automated daily, documented restore |
| Availability | Single instance; redeploy causes brief downtime, documented |
| Browser support | Current Chrome, Safari, Firefox, Edge |

## 11. Copy rules

The interface speaks to a studio owner, not to a developer. Product nouns are
Project, Deliverable, Client link, Status, Due date. "MCP" and "Claude" appear
only on the connection screen, where they are the subject.

No invented testimonials, customer counts, logos or metrics. The demo account
is labelled as sample data.

## 12. Definition of done

A recruiter can open the URL, sign in with the supplied account, create a
project, add a deliverable, edit it, copy the client link, open that link in a
private window, revoke it and see it stop working. A second person can connect
their own Claude account to the MCP endpoint with their own credential and have
Claude create and update the same records, with the changes visible in the app.
Data survives a redeploy.
