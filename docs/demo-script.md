# Five minute demo

Run order matters: create the project and the deliverables first, so by the time the client
link and Claude are shown there is something real on screen. Timings assume a live app on
the public origin, signed out, in one browser window.

## 0:00 Overview, 30 seconds

"This is Clientroom. A design studio signs up, keeps one project per client engagement, and
sends the client a read-only link. The same data can also be driven from Claude through an
MCP endpoint. The app has no AI inside it: no model, no key, no inference call."

Say the last sentence plainly. It is the requirement that most submissions fail.

## 0:30 Sign up, 30 seconds

Open the app, sign up with a fresh email and a password.

Point at the empty workspace: the form is already open and focused, because naming the
first project is the only thing to do. Type a client name, for example "Northwind rebrand",
and submit.

## 1:00 The project, 90 seconds

Add three deliverables in the row under the table: wordmark, brand guide, social kit. Set
one to done, one to in progress. Put a due date on one, in the past, and note that it turns
red.

Then edit a title in place and change a status. "Everything on this page saves on the spot.
No edit mode, no save button, no modal."

Add an internal note with the "Add one" control. "The client never sees this line."

## 2:30 The client link, 60 seconds

Click Client link, create it, copy it. Open it in a private window. "No account, no sign in.
This is what the client sees: the project title and the deliverables with their statuses."

Switch back, revoke the link, reload the private window. "410. Access stops on the next
load, which is the point of revocation."

## 3:30 Claude, 60 seconds

Settings, Connect Claude. Show the three numbered steps. Create a credential, and point out
that the token is shown once and only a prefix is kept afterwards.

In Claude, ask for something concrete: "Using Clientroom, add a deliverable called print
pack to Northwind rebrand, due 20 November, status blocked." Come back to the app, reload,
and the row is there.

"Five tools: create a project, add a deliverable, update one, read one, list them. Deleting
and sharing are not tools, because those should be a person's decision."

If a live Claude account is not available, show the endpoint answering instead: a `POST`
to `/mcp` with the token, `tools/list` returning five tools. Say that protocol compliance
is verified and that a real Claude connection is not, rather than implying both.

## 4:30 Close, 30 seconds

"The interesting decisions were the boring ones. SQLite on a volume, so a studio's data is
one file that can be backed up and restored. A signature check on the cookie instead of a
sessions table. One share link per project. And a hard line between what a person does and
what an agent may do."

Then hand over: the URL, the demo credentials, the MCP endpoint, and the documents list.

## Questions to expect

**"Why no AI in the app?"** Because the assignment put the model on the customer's side.
Adding a second model inside the product would duplicate it, add a key to manage, and make
the tool slower for everyone who does not want it.

**"Why SQLite?"** The workload is one studio and a few hundred rows. A file plus a volume is
simpler to run, simpler to back up and simpler to reason about than a network database. The
cost is one instance, which is written down in the operations doc.

**"What happens if the volume dies?"** Railway's daily backups restore into a new volume,
and the restore procedure is rehearsed and documented. If the rehearsal has not been run
yet, say so.

**"What would you build next?"** Password reset, then a second labelled share link, then a
read-only access log for links.
