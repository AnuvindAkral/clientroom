# 13. Submission email

Subject: Clientroom: a client delivery workspace that runs on Claude via MCP

Hello,

I am submitting Clientroom, a small product I built for the assignment.

Clientroom is a client delivery workspace for a small design or branding studio. A studio
keeps one project per client engagement, tracks the deliverables and their statuses, and
sends the client a read-only link that needs no account. The same data can also be driven
from Claude through an MCP endpoint. The app itself has no model, no API key and no
inference call.

Live app: https://clientroom-production.up.railway.app
MCP endpoint: https://clientroom-production.up.railway.app/mcp
Repository: https://github.com/AnuvindAkral/clientroom
Demo account: demo@clientroom.app / clientroom-demo-2026

The demo account holds one fabricated sample project with four deliverables and is safe to
edit. Its MCP credential is not published; one can be created from Settings in a minute.

The README and the documents in `docs/` cover the product, the architecture, the MCP
reference, the operations runbook, the test report and the limitations. The five minute
demo script is `docs/demo-script.md`.

On Claude compatibility: the endpoint passes 44 of 44 production acceptance checks and 8
of 8 checks with the official MCP SDK client over Streamable HTTP, and data survives a
real redeploy. A connection from an actual Claude account has not yet been run, and I have
not claimed it. The steps to run it are in `docs/06-mcp-reference.md`.

Thank you for the assignment. I enjoyed the constraint of putting the model on the
customer's side and keeping the application boring.

Best,
Anuvind

Do not send this until the checklist in `docs/final-handover/14_PERSONAL_LEARNING_GUIDE.md`
section 13 and `docs/09-submission.md` section 9 are complete.
