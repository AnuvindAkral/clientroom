import type { ShareResolution } from '../services/share.js';
import { STATUS_LABELS, type Status } from '../lib/status.js';
import { formatShortDate } from '../lib/time.js';

const escapeHtml = (value: string): string =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

const STYLE = `
:root{
  --paper:#f6f5f0;--surface:#ffffff;--ink:#17170f;--muted:#6e6c61;
  --rule:#dad7cb;--spot:#1f3fd8;--danger:#a3241b;
  --sans:"IBM Plex Sans",ui-sans-serif,system-ui,sans-serif;
  --cond:"IBM Plex Sans Condensed","IBM Plex Sans",ui-sans-serif,sans-serif;
  --mono:"IBM Plex Mono",ui-monospace,SFMono-Regular,monospace;
}
*{box-sizing:border-box}
html,body{margin:0;padding:0}
body{background:var(--paper);color:var(--ink);font-family:var(--sans);font-size:16px;line-height:1.5;-webkit-font-smoothing:antialiased}
.page{max-width:760px;margin:0 auto;padding:56px 28px 72px}
.masthead{display:flex;align-items:baseline;justify-content:space-between;gap:24px;border-bottom:1px solid var(--rule);padding-bottom:14px}
.wordmark{font-family:var(--cond);font-weight:600;font-size:15px;letter-spacing:.14em;text-transform:uppercase;color:var(--muted)}
.readonly{font-family:var(--mono);font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:var(--muted)}
h1{font-family:var(--cond);font-weight:600;font-size:clamp(30px,5vw,44px);line-height:1.05;letter-spacing:-.01em;margin:30px 0 8px}
.meta{font-family:var(--mono);font-size:12px;color:var(--muted);margin:0 0 40px}
.list{border-top:1px solid var(--ink)}
.row{display:grid;grid-template-columns:1fr auto auto;align-items:center;gap:20px;padding:15px 2px;border-bottom:1px solid var(--rule)}
.title{font-size:17px;line-height:1.35;padding-right:8px}
.stamp{font-family:var(--mono);font-size:10.5px;letter-spacing:.09em;text-transform:uppercase;white-space:nowrap;border:1px solid var(--rule);padding:4px 8px;border-radius:2px;color:var(--muted);justify-self:end}
.stamp.done{color:#2c5e3f;border-color:#b9cdbe}
.stamp.in_progress{color:#8a5a12;border-color:#dfc79a}
.stamp.blocked{color:var(--danger);border-color:#dcb3ae}
.due{font-family:var(--mono);font-size:12px;color:var(--muted);min-width:92px;text-align:right;white-space:nowrap}
.due.overdue{color:var(--danger)}
.empty{padding:40px 2px;color:var(--muted);border-bottom:1px solid var(--rule)}
.foot{margin-top:44px;font-size:13px;color:var(--muted);max-width:46ch}
.state{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:32px}
.state-inner{max-width:440px}
.state h1{font-size:32px;margin:0 0 12px}
.state p{color:var(--muted);margin:0}
.state .wordmark{display:block;margin-bottom:28px}
@media (max-width:520px){
  .page{padding:32px 18px 48px}
  .row{grid-template-columns:1fr auto;row-gap:8px}
  .due{grid-column:2;grid-row:2;text-align:right}
  .stamp{grid-column:2;grid-row:1}
  .title{grid-column:1;grid-row:1}
}
@media print{
  body{background:#fff}
  .page{padding:0}
  .stamp{border-color:#999}
}
`;

function document(title: string, body: string): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>${escapeHtml(title)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans+Condensed:wght@600&family=IBM+Plex+Sans:wght@400;500&display=swap" rel="stylesheet">
<style>${STYLE}</style>
</head>
<body>${body}</body>
</html>`;
}

function statePage(wordmark: string, heading: string, line: string): string {
  return document(
    heading,
    `<main class="state"><div class="state-inner">
      <span class="wordmark">${escapeHtml(wordmark)}</span>
      <h1>${escapeHtml(heading)}</h1>
      <p>${escapeHtml(line)}</p>
    </div></main>`,
  );
}

export function renderSharePage(resolution: ShareResolution): { status: number; html: string } {
  if (resolution.state === 'not_found') {
    return {
      status: 404,
      html: statePage(
        'Clientroom',
        'This link does not exist',
        'Check the address, or ask the studio for a fresh link.',
      ),
    };
  }

  if (resolution.state === 'revoked') {
    return {
      status: 410,
      html: statePage(
        'Clientroom',
        'This link is no longer active',
        'The studio has turned off this link. Ask them for a new one if you still need access.',
      ),
    };
  }

  const { project, items } = resolution;
  const today = new Date().toISOString().slice(0, 10);

  const rows = items
    .map((item) => {
      const overdue = item.dueDate !== null && item.dueDate < today && item.status !== 'done';
      return `<div class="row">
        <div class="title">${escapeHtml(item.title)}</div>
        <span class="stamp ${escapeHtml(item.status)}">${escapeHtml(
          STATUS_LABELS[item.status as Status] ?? item.status,
        )}</span>
        <div class="due${overdue ? ' overdue' : ''}">${escapeHtml(
          formatShortDate(item.dueDate) || 'No date',
        )}</div>
      </div>`;
    })
    .join('');

  const body = `<main class="page">
    <header class="masthead">
      <span class="wordmark">Clientroom</span>
      <span class="readonly">Read only</span>
    </header>
    <h1>${escapeHtml(project.title)}</h1>
    <p class="meta">Updated ${escapeHtml(formatShortDate(project.updatedAt.slice(0, 10)))}</p>
    <section class="list">
      ${rows || '<div class="empty">No deliverables have been added yet.</div>'}
    </section>
    <p class="foot">This is a read-only view. Nothing here can be edited. Ask the studio if something looks out of date.</p>
  </main>`;

  return { status: 200, html: document(`${project.title} · Clientroom`, body) };
}
