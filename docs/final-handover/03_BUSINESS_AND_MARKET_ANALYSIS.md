# 03. Business and market analysis

## Target customer

Solo and small design, branding or creative studios, one to eight people. The founder is
also the project manager, the account manager and often the designer. Three to eight
concurrent client engagements. No dedicated operations person.

## Buyer and end user

The same person. The founder buys and uses. There is no procurement layer, no IT review,
no security questionnaire at this size. That makes the sale a product-led motion, not an
enterprise one.

## The problem

The information about a client engagement is scattered across email, a Notion page, a shared
drive, a Trello board and the invoice. The status of each deliverable is reconstructed by
hand when the client asks, and the answer is usually out of date. The founder spends a few
hours a week keeping that picture current, and the client still does not trust it.

## Existing alternatives

- Notion, Google Docs, Confluence: flexible, familiar, but permissions are managed per
  project and per client, and there is no status vocabulary.
- Trello, Asana, ClickUp, Linear: good task boards, but built for internal teams, and
  sharing a read-only view with a client means inviting them or screenshotting.
- HoneyBook, Dubsado: built for creatives, but heavy, opinionated about the whole
  business, and priced for that.
- Email and spreadsheets: the actual incumbent. Free, flexible, and the reason most
  studios do not buy anything.

## Why an agency might choose Clientroom

- One list per client, one link, no client account. The setup cost per project is near
  zero.
- The client link is a web page, not an invitation. It updates itself.
- If the studio uses Claude, the same workspace can be driven from a conversation, so a
  status update takes a sentence.
- The app has no model, no key, no per-request cost, and nothing that breaks when a
  provider changes an API.

## Why an agency might reject Clientroom

- Their existing tools are broader and more familiar, and switching costs are real.
- The pain may not be strong enough to pay for. Keeping a client informed is annoying but
  not always expensive.
- Clients may not open the link. A link nobody reads is a feature nobody values.
- The MCP connection, which is the differentiator, may turn out to be rarely used.
- One owner per account means a two-person studio needs two workspaces.

## Differentiation

One workflow, one screen per project. No general purpose workspace, no template gallery, no
marketplace. MCP is a second door, not a feature: the same five operations are available
to a person and to an agent, and both write to the same rows. The app has no model, so
there is no key to manage, no latency, and no cost per request.

## Business model

Software as a service, monthly subscription, one workspace per account.

### Pricing hypothesis

- Free: one project, one client link, no MCP. Enough to feel the product.
- Solo at 15 USD per month: unlimited projects, client links, MCP connection.
- Studio at 40 USD per month: up to five seats, shared workspace, link audit log.

These are hypotheses, not prices that have been tested.

## Costs

Infrastructure is one Railway service, one volume, one domain. At this scale the cost is
roughly a few dollars a month. There is no model cost, no per-request cost, and no
third-party API. The margin is high because the product has no variable cost per user
beyond storage, which is negligible.

## Customer acquisition

Start with solo founders and freelancers who already use Claude, because the MCP door is
the hook that makes Clientroom different from a Notion template. Content that shows a real
workflow: a video of creating a project and three deliverables in one sentence is the whole
pitch in twenty seconds. No paid acquisition until retention is measured.

## First ten customers

Direct outreach to studios found through their portfolios, with a short message and a link
to the live app. The goal is not signups, it is conversations: does the pain exist, and is
the link useful to their clients.

## First hundred customers

Content and word of mouth among studios. The product has to be good enough that a studio
shows it to another studio. That requires the client link to be genuinely useful, which is
the unvalidated assumption.

## One year

A small number of paying solo accounts, password reset, a second share link per project
with labels, and a read-only access log for links. Team seats only if a studio asks for
them.

## Three years

Either a niche tool that a few hundred studios pay for and that funds itself, or a
feature inside a larger studio platform. The honest version is that the three year shape
depends on whether the pain is strong enough, and that is not known yet.

## Main business risks

- The pain is not strong enough to pay for.
- Clients do not open the link, so the shared view is unused.
- Existing tools are good enough and switching costs are high.
- The MCP connection, which is the differentiator, turns out to be rarely used.
- One owner per account limits growth inside a studio.
- Scheduled backups need a paid plan, so the free tier of the product carries an
  operational cost in attention.

## What is evidence and what is assumption

| Claim | Status |
|---|---|
| Studios keep delivery status in email and Notion | Verified complaint, not verified spend |
| Clients ask for status updates | Verified complaint |
| Studios want a read-only client view without a login | Assumption |
| Studios will pay 15 USD per month | Unvalidated hypothesis |
| Clients will open the link | Unvalidated hypothesis |
| Studios using Claude will use the MCP door | Unvalidated hypothesis |
| Retention beyond the first week | Unvalidated hypothesis |

Nothing in this document is based on customer interviews, revenue, usage data or market
research. The idea has not been commercially validated.
