# 10. Live demo playbook

## Starting state

- Browser open, signed out, one window.
- A private or incognito window ready.
- Terminal ready with the production check command, in case the fallback is needed.
- The live app URL copied: https://clientroom-production.up.railway.app

## Login instructions

Use the demo account `demo@clientroom.app` / `clientroom-demo-2026`, or create a fresh
account on the live origin. The demo account has one sample project with four deliverables.
If you create a fresh account, the workspace opens with the create form focused.

## Exact demo scenario

1. Sign in.
2. Create a project named "Northwind rebrand".
3. Add three deliverables: wordmark, brand guide, social kit.
4. Set wordmark to done, brand guide to in progress, social kit to not started.
5. Put a due date on brand guide that is four days away.
6. Edit the brand guide title inline to "Brand guidelines".
7. Change social kit to blocked.
8. Add an internal note: "client prefers minimal".
9. Click Client link, create it, copy it.
10. Open the link in a private window. Show the project, the deliverables, the stamps,
    the dates. Point out the note is absent and the account email is absent.
11. Revoke the link. Reload the private window. Show 410.
12. Open Settings, Connect Claude. Show the three steps. Create a credential. Point out
    the token is shown once and only a prefix is kept.
13. If Claude is connected, run the request and reload to show the row. If not, run the
    endpoint request and say so.

## Exact natural language request

"Using Clientroom, add a deliverable called print pack to Northwind rebrand, due 20
November, status blocked."

## Expected MCP calls

1. `create_project` with title "Northwind rebrand" (if not already created in the app).
2. `create_item` with project_id, title "print pack", status "blocked", due_date
   "2026-11-20".
3. `get_project` to read back the result.

## Expected application result

A new row in the project table titled "print pack", status Blocked, due date 20 Nov 2026.
The project's updated timestamp moves. The row appears on reload.

## Manual editing demonstration

- Edit a title in place: click, type, blur or Cmd+Enter. No save button, no modal.
- Change a status from the select. The toast confirms.
- Change a due date. Overdue dates turn red when status is not Done.
- Delete a deliverable: hover or focus the row, click remove, confirm once inline.

## Client-facing link demonstration

- Create the link, copy it, open in a private window.
- Show the project title, the deliverables with status stamps and dates.
- Show there is no description, no edit control, no login prompt.
- Revoke, reload, show 410.

## Persistence demonstration

If time allows, mention that the data survived a real redeploy: an account created before
the redeploy could sign in after, read the project, and find both deliverables with the
edited status intact. 5 of 5 checks passed.

## Closing explanation

"The interesting decisions were the boring ones. SQLite on a volume, so a studio's data
is one file that can be backed up and restored. A signature check on the cookie instead of
a sessions table. One share link per project. And a hard line between what a person does
and what an agent may do."

## Fallback if Claude is unavailable

Do not skip the section. Run the endpoint request instead:

1. Show the credential prefix in Settings.
2. Open a terminal and run `tools/mcp-client-check.mjs` against the live origin, or show
   the production check output.
3. Say plainly: "Protocol compliance is verified with the official SDK client. A real
   Claude account connection is not, and I am not claiming it."

Do not imply that the SDK test is a Claude test. The distinction is the point.
