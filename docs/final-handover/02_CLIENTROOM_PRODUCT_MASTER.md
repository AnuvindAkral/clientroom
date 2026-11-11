# 02. Clientroom product master

## What Clientroom is

Clientroom is a client delivery workspace for a small design, branding or creative agency.
One project per client engagement, the deliverables inside it, and a read-only link the
client can open without an account.

One sentence: the studio's delivery list, always current, visible to the client without a
login.

## The problem

A studio's delivery status lives in the studio's head, in email, or in a Notion page whose
permissions someone has to manage. The client's question, "where are we?", has no cheap,
current answer. Building a client-facing view in a general tool costs setup time per
project and a login per client.

Clientroom removes both costs: one list per client, one link, no client account.

## Who uses it

Two people, though only one has an account.

- The studio owner or account lead. They create the project, add deliverables, update
  statuses and dates, and share the link. They are the user and the buyer.
- The client. They open the link and read. No account, no app install, no permission
  dialog.

## The complete workflow

1. The studio signs in.
2. It creates a project, in the app or by asking Claude.
3. It adds deliverables, in the app or by asking Claude.
4. It updates status and dates, in the app or by asking Claude.
5. It shares the link with the client and revokes it when the engagement ends.

Every step works with Claude disconnected. Claude is an additional input method, never a
dependency.

## Example end to end

A studio signs up with `ana@studio.test`. The workspace opens with the create form already
focused. They name the first project "Acme brand refresh" and submit. The project page
opens empty. They add three deliverables: Logo, Brand guide, Social kit. They set Logo to
done, Brand guide to in progress, Social kit to not started. They put a due date on Brand
guide that is four days away.

They click "Client link", create it, copy the URL and send it to the client. The client
opens it in a private window and sees the project title and the three deliverables with
their status stamps and dates. No login, no app. The internal note "client prefers
minimal" is not there.

Two days later the studio changes Brand guide to blocked and moves the due date back. The
next time the client opens the link, the stamp reads Blocked and the date has moved. No
message, no email, no re-send. The link is the same link.

When the engagement ends, the studio revokes the link. The client's next load returns 410,
"this link is no longer active".

## Screens and interactions

### `/login` and `/signup`

Two fields and one button. Single column, max 420px. Errors inline under the field, never
in a toast. Autofocus email. Enter submits. Submit disabled only while the request is in
flight.

### `/` project list

Left rail 232px: wordmark, project links ordered by last update, Settings. Main area: page
title, "New project" button opening an inline form, then project rows. Each row shows
title, one line of description, counts and relative updated time.

Empty workspace: the form is the empty state. It opens and focuses itself, carries one
lead line, and the Cancel button is hidden because there is nothing to cancel back to.
With projects present, the list shows and a footnote gives the workspace count.

Mobile: the rail becomes a two row header, brand and account on the first line, project
links under it.

### `/projects/:id`

Title and description editable in place. Click to edit, blur or Cmd+Enter to save, Escape
to cancel. Deliverable row: title input, status select, date input, remove button on
hover or focus. Overdue dates render in the danger colour when status is not Done. "+ Add
deliverable" appends a focused empty row; Enter saves, Escape cancels.

Share panel opens under the header button: if no active link, a "Create client link"
action; if active, the URL, Copy, Open and Revoke. Revoke asks for confirmation inline.

Loading uses skeleton rows. Errors show a single inline banner with Retry, keeping current
data.

### `/settings/claude`

No credential: one button. After creation: token shown once in a read-only field with
Copy and a warning, plus three numbered connection steps. Existing credential: prefix,
created date, Regenerate, Revoke. Regenerate and Revoke confirm inline. The connection URL
is rendered from the app's public origin and is copyable.

### `/s/:token` client view

Max 720px, print-like calm. Status rendered as a stamped word in uppercase mono inside a
hairline box, colour-coded by text and border only. No editing controls, no login prompt,
no description. Revoked or unknown token: "This link is no longer active" with 410 for
revoked and 404 for unknown. `noindex, nofollow`. No analytics.

## Status vocabulary

Four statuses, one canonical set: `not_started`, `in_progress`, `blocked`, `done`. Labels:
Not started, In progress, Blocked, Done.

MCP accepts common synonyms (`complete`, `completed`, `todo`, `in progress`, `on hold`)
and normalises them. Invalid values are rejected with the allowed list.

## Interaction rules

- Every mutation returns a result the user can see: inline state change plus a short
  toast. No silent writes.
- Saves are optimistic only where the failure is recoverable; on failure the previous
  value returns and an inline error explains what happened.
- Empty states name the next action.
- Loading states use layout-stable skeletons, not spinners on full pages.
- Errors say what failed and what to do. They do not apologise.
- Destructive actions confirm once, in place. No modal stack.
- Keyboard: every control reachable by Tab, visible focus ring, Escape closes the share
  panel.
- Reduced motion respected; no animation longer than 200ms.
- Mobile down to 360px: the rail collapses, the table becomes stacked rows.

## Visual direction

A studio job sheet. Print-shop utilitarianism, not a SaaS dashboard. Hairline rules,
tabular numbers, stamped statuses, one spot colour. IBM Plex Condensed for display, IBM
Plex Sans for body, IBM Plex Mono for statuses, dates, counts and IDs. Self-hosted,
subset, `font-display: swap`. Radius 2px. No gradients, no glow, no glass.

The signature element is the status stamp: a word in mono uppercase inside a hairline box,
colour-coded only by text and border, stamped across the client page and the app table.
It is the one element people remember, and it is a real piece of the product's vocabulary.

## Copy rules

The interface speaks to a studio owner, not to a developer. Product nouns are Project,
Deliverable, Client link, Status, Due date. "MCP" and "Claude" appear only on the
connection screen, where they are the subject.

No invented testimonials, customer counts, logos or metrics. The demo account is labelled
as sample data.
