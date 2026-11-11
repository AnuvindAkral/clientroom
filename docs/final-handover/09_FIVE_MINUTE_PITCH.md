# 09. Five minute pitch

Assignment timings: 0:00 to 0:45 introduction and background; 0:45 to 1:15 relevant
work and proof; 1:15 to 2:15 business, customer, problem and solution; 2:15 to 4:15
live demonstration; 4:15 to 5:00 economics and growth.

## 0:00 to 0:45, introduction and background

On screen: the live app, signed out, on the login page.

"I am Anuvind. I built Clientroom for this assignment. Clientroom is a client delivery
workspace for a small design or branding studio. One project per client engagement, the
deliverables inside it, and a read-only link the client can open without an account.

The constraint that shaped it: the application has no AI inside it. No model, no API key,
no inference call. Claude is a second way to reach the same database, not a feature of the
product. I will show why that matters in a minute."

## 0:45 to 1:15, relevant work and proof

On screen: README and the deployed URL.

"The app is live on Railway. It has accounts, projects, deliverables, client links and
per-user MCP credentials. The MCP endpoint is public and speaks Streamable HTTP. The data
is in SQLite on a mounted volume. There are 36 backend tests, 8 browser tests, and a
production acceptance script that runs 44 checks against the live origin, including
ownership isolation, share link revocation and credential rotation. Data survives a real
redeploy: 5 of 5 persistence checks passed after `railway redeploy`."

## 1:15 to 2:15, business, customer, problem and solution

On screen: the product requirements doc, briefly, then back to the app.

"The customer is a solo or small design studio, one to eight people, with three to eight
concurrent clients. The buyer and the user are the same person, the founder. Today their
delivery status lives in email, Notion and spreadsheets, and the client's question, where
are we, has no cheap current answer. Clientroom is one list per client, one link, no
client account. The studio updates it in the app or by asking Claude. The client opens the
link and reads."

## 2:15 to 4:15, live demonstration

On screen: the live app, signed in with the demo account or a fresh account.

"Let me show it." (45 seconds on the app, then 75 seconds on the client link, then 45
seconds on Claude or the fallback.)

- Create a project called "Northwind rebrand".
- Add three deliverables: wordmark, brand guide, social kit. Set one to done, one to in
  progress, one with a past due date so it turns red.
- Edit a title inline. Change a status. "Everything saves on the spot. No edit mode, no
  save button, no modal."
- Add an internal note. "The client never sees this."
- Click Client link, create it, copy it. Open it in a private window. "No account, no
  sign in. This is what the client sees."
- Revoke the link. Reload the private window. "410. Access stops on the next load."
- Open Settings, Connect Claude. Show the three steps. Create a credential, point out the
  token is shown once and only a prefix is kept.

If a Claude account is connected: ask Claude to add a deliverable, come back to the app,
reload, and the row is there. If not: run the endpoint request and say plainly that
protocol compliance is verified and a real Claude connection is not, rather than implying
both. The exact words: "I have not run this against a real Claude account, so I am not
claiming it. The protocol is verified; the Claude connection is the one thing I have not
tested."

## 4:15 to 5:00, economics and growth

On screen: a simple slide or the README.

"Pricing is a hypothesis, not a tested price: free for one project, 15 USD a month for a
solo studio, 40 USD for up to five seats. Infrastructure is a few dollars a month because
there is no model cost. Growth starts with solo founders who already use Claude, because
the MCP door is the hook. The honest risks: the pain may not be strong enough to pay for,
clients may not open the link, and the MCP connection may turn out to be rarely used. I
would rather say that now than discover it after."

Close: "Thank you. The URL, credentials and documents are in the handover."

## Timing notes

- The demo is the longest section. Practise it until it fits in 90 seconds without
  rushing.
- Do not narrate clicks. Say what the screen shows, not what your hand does.
- If a click fails, do not apologise. Say what should have happened and move on.
- The Claude section is the only part that can break. Have the fallback ready and say it
  without hesitation if needed.

## What must not be said

- No customer interviews, revenue, traction, testimonials or market research.
- No claim that Claude compatibility has been verified.
- No claim that scheduled backups exist on the current plan.
- No claim that team seats, password reset, file uploads or notifications exist.
