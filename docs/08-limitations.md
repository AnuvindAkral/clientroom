# Limitations

What this build does not do, and why each omission is deliberate rather than unfinished.
A limitation that is written down is a decision. One that is hidden is a defect.

## Product scope

**One owner per account, no team.** Two people at the same studio would need two accounts
and would see separate workspaces. Adding seats means an invitations table, roles and a
rethink of every query. It was not in scope, and half of it would have been worse than
none.

**One active share link per project.** Creating a second link revokes the first. The
alternative, several links with labels and per-link expiry, is a real feature with a real
interface, and the workflow only needs one link per client engagement.

**No link expiry.** Deferred on purpose. Revocation is the stated requirement and it works
immediately. Expiry adds a second way for a client to hit a dead link, plus a date control
on every share panel, for a problem that revocation already solves for a studio with a
handful of clients.

**No client commenting, approval or sign-off.** The client page reads. The studio hears
back through the channel they already use. A comment thread would make the client page a
two-way product and pull in identity, spam and notification concerns.

**No file uploads, invoices, time tracking, chat or notifications.** Each is a product of
its own. The assignment asked for a small, working thing.

**No password reset and no email verification.** Both need outbound email, which needs a
provider, a domain and a secret. The evaluator account is seeded and the credentials are in
the handover. Password reset is the first thing to add before real customers.

**No dark mode, no themes, no internationalisation.** One visual direction, one language.
The design is deliberate, not a default theme with the colours swapped.

## Engineering

**SQLite on a single instance.** The volume can only attach to one service, and a second
replica would write its own file. Scaling horizontally means moving to a networked
database, which contradicts the storage decision that was frozen for this build. The
constraint and the recovery plan are in [docs/05-operations.md](05-operations.md).

**A redeploy is a short outage.** Railway stops the old container before starting the new
one. A few seconds, once per deploy. Acceptable for a tool a studio opens between client
calls, not acceptable for a payment flow.

**No background jobs.** Nothing is scheduled inside the app. Backups are pulled by hand with
`tools/backup.sh` until the workspace is on a plan with a backup schedule, so the recovery
point depends on how recently someone ran it.

**Rate limiting is per process and in memory.** Twenty authentication attempts and ten
credential operations per minute per address. One instance makes that correct; more
instances would need a shared store.

**`projects.status` is always `active`.** The column exists in the frozen schema and is
returned by MCP, but nothing sets it to another value. Project-level state (archived,
closed) was not part of the workflow. It is reserved, and unused today.

**Session lifetime is seven days, fixed.** No "remember me", no sliding expiry. Signing out
clears the cookie.

**Share tokens are encrypted with a key derived from `SESSION_SECRET`.** Rotating that
secret invalidates live share links, which is documented but still a coupling worth
knowing about.

## Interface

**Dates in the app use the browser's native date input**, which renders in the machine's
locale (`05/11/2026` here). The client page and the project header render `5 Nov 2026`. The
inconsistency is accepted: the native picker is faster and more accessible than a custom
one, and the client-facing page, where clarity matters most, is the consistent one.

**No bulk actions.** No select all, no multi-delete, no drag to reorder. Deliverables are
few per project and ordering is creation order.

**No undo.** Deleting a deliverable asks once and then removes it. There is no recycle bin,
because a bin is a second data model.

## Verification gaps

Protocol compliance is tested. A real Claude account reaching the endpoint is not, and is
never claimed until it is. Browser coverage is Chromium only. There is no load test, no
soak test and no restore rehearsal recorded yet. See
[docs/07-test-report.md](07-test-report.md).

## What a next version would do first

1. Password reset with a real email provider, because it blocks real accounts.
2. A second share link per project with labels, so one client's link is not the same as the
   next client's.
3. A read-only access log for share links: who opened it, when, how many times. That is the
   question every studio asks after sending one.
4. Team seats, once one studio asks for them.
