// Production acceptance check. Runs the critical workflows against a live origin
// over HTTPS and prints one line per criterion.
//
//   BASE=https://clientroom-production.up.railway.app node tools/production-check.mjs
//   BASE=https://clientroom-production.up.railway.app node tools/production-check.mjs --after-redeploy
//
// The first form creates an account, project, deliverables, a share link and an
// MCP credential, and writes .prod-state.json. Run it again with
// --after-redeploy after a redeploy to prove the data and the session survived.

import { readFile, writeFile } from 'node:fs/promises';

const BASE = process.env.BASE;
const afterRedeploy = process.argv.includes('--after-redeploy');
const STATE = '.prod-state.json';

if (!BASE) {
  console.error('Set BASE to the public origin, for example https://app.up.railway.app');
  process.exit(2);
}

let pass = 0;
let fail = 0;
const failures = [];

function check(name, ok, detail = '') {
  if (ok) {
    pass += 1;
    console.log(`PASS  ${name}${detail ? '  ' + detail : ''}`);
  } else {
    fail += 1;
    failures.push(name);
    console.log(`FAIL  ${name}${detail ? '  ' + detail : ''}`);
  }
}

async function call(path, options = {}) {
  const response = await fetch(BASE + path, options);
  const text = await response.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = null;
  }
  return { status: response.status, text, json, headers: response.headers };
}

function cookieFrom(response) {
  const raw = response.headers.getSetCookie?.() ?? [];
  const session = raw.find((value) => value.startsWith('cr_session='));
  return session ? session.split(';')[0] : null;
}

function sessionCookieHeader(response) {
  const raw = response.headers.getSetCookie?.() ?? [];
  return raw.find((value) => value.startsWith('cr_session=')) ?? '';
}

function jsonHeaders(cookie, extra = {}) {
  const headers = { 'content-type': 'application/json', origin: BASE, ...extra };
  if (cookie) headers.cookie = cookie;
  return headers;
}

async function rpc(token, body, accept = 'application/json, text/event-stream') {
  const response = await fetch(BASE + '/mcp', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      accept,
      authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  const text = await response.text();
  let json = null;
  for (const line of text.split('\n')) {
    if (!line.startsWith('data: ')) continue;
    try {
      json = JSON.parse(line.slice(6));
    } catch {
      json = null;
    }
  }
  if (!json) {
    try {
      json = JSON.parse(text);
    } catch {
      json = null;
    }
  }
  return { status: response.status, json, text };
}

async function main() {
  if (afterRedeploy) {
    const state = JSON.parse(await readFile(STATE, 'utf8'));

    const login = await call('/api/auth/login', {
      method: 'POST',
      headers: jsonHeaders(null),
      body: JSON.stringify({ email: state.email, password: state.password }),
    });
    check('D5 session and account survive a redeploy', login.status === 200, `status ${login.status}`);

    const cookie = cookieFrom(login);
    const project = await call(`/api/projects/${state.projectId}`, { headers: jsonHeaders(cookie) });
    check('D5 project survives a redeploy', project.status === 200, `status ${project.status}`);
    const items = project.json?.items ?? [];
    check('D5 deliverables survive a redeploy', items.length >= 2, `${items.length} items`);
    check(
      'D5 edited values survive a redeploy',
      items.some((item) => item.title === 'Brand guide' && item.status === 'in_progress'),
      'Brand guide in progress',
    );

    const projects = await call('/api/projects', { headers: jsonHeaders(cookie) });
    check(
      'D5 project list survives a redeploy',
      projects.json?.projects?.some((entry) => entry.id === state.projectId),
    );

    console.log(`\n${pass} passed, ${fail} failed`);
    if (fail > 0) {
      console.log('Failed: ' + failures.join(', '));
      process.exit(1);
    }
    return;
  }

  // ---- transport ----
  const health = await call('/healthz');
  check('D2 /healthz is healthy', health.status === 200 && health.json?.database === 'ok', JSON.stringify(health.json));

  const root = await call('/');
  check('D1 app loads over HTTPS', root.status === 200 && root.text.includes('<title>Clientroom'));

  const unauth = await fetch(BASE + '/mcp', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize' }),
  });
  check('M1 unauthenticated MCP returns 401', unauth.status === 401, `status ${unauth.status}`);

  const getMcp = await fetch(BASE + '/mcp');
  check('M9 GET /mcp returns 405', getMcp.status === 405, `status ${getMcp.status}`);

  // ---- account ----
  const stamp = Date.now();
  const email = `acceptance.${stamp}@clientroom.test`;
  const password = 'acceptance-test-pass';
  const signup = await call('/api/auth/signup', {
    method: 'POST',
    headers: jsonHeaders(null),
    body: JSON.stringify({ email, password }),
  });
  check('A1 signup creates a session', signup.status === 200 || signup.status === 201, `status ${signup.status}`);
  const cookie = cookieFrom(signup);
  const sessionHeader = sessionCookieHeader(signup);
  check(
    'A6 session cookie is HttpOnly, Secure, SameSite=Lax',
    /HttpOnly/i.test(sessionHeader) && /Secure/i.test(sessionHeader) && /SameSite=Lax/i.test(sessionHeader),
    sessionHeader.split(';').slice(1).join(';').trim(),
  );

  const me = await call('/api/me', { headers: jsonHeaders(cookie) });
  check('A1 session resolves to the account', me.json?.user?.email === email);

  const weak = await call('/api/auth/signup', {
    method: 'POST',
    headers: jsonHeaders(null),
    body: JSON.stringify({ email: `weak.${stamp}@clientroom.test`, password: 'short' }),
  });
  check('A3 short password is rejected', weak.status === 400 || weak.status === 422, `status ${weak.status}`);

  const duplicate = await call('/api/auth/signup', {
    method: 'POST',
    headers: jsonHeaders(null),
    body: JSON.stringify({ email, password }),
  });
  check('A2 duplicate email is rejected', duplicate.status === 409, `status ${duplicate.status}`);

  const badOrigin = await call('/api/projects', {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: 'https://not-the-app.example', cookie },
    body: JSON.stringify({ title: 'Foreign origin' }),
  });
  check('A9 foreign origin write is rejected', badOrigin.status === 403, `status ${badOrigin.status}`);

  // ---- projects and deliverables ----
  const created = await call('/api/projects', {
    method: 'POST',
    headers: jsonHeaders(cookie),
    body: JSON.stringify({ title: 'Acceptance project', description: 'Written by the production check.' }),
  });
  const projectId = created.json?.project?.id;
  check('P2 project is created', created.status === 200 || created.status === 201, `status ${created.status}`);

  const blank = await call('/api/projects', {
    method: 'POST',
    headers: jsonHeaders(cookie),
    body: JSON.stringify({ title: '   ' }),
  });
  check('P1 blank title is rejected', blank.status === 400 || blank.status === 422, `status ${blank.status}`);

  const first = await call(`/api/projects/${projectId}/items`, {
    method: 'POST',
    headers: jsonHeaders(cookie),
    body: JSON.stringify({ title: 'Logo', status: 'done', due_date: '2026-11-05' }),
  });
  const firstId = first.json?.item?.id;
  check('P4 deliverable is created', Boolean(firstId), `status ${first.status}`);

  const second = await call(`/api/projects/${projectId}/items`, {
    method: 'POST',
    headers: jsonHeaders(cookie),
    body: JSON.stringify({ title: 'Brand guide', status: 'not_started', due_date: '2026-11-20' }),
  });
  const secondId = second.json?.item?.id;
  check('P4 second deliverable is created', Boolean(secondId), `status ${second.status}`);

  const patched = await call(`/api/items/${secondId}`, {
    method: 'PATCH',
    headers: jsonHeaders(cookie),
    body: JSON.stringify({ status: 'in progress' }),
  });
  check('P5 status edit persists and normalises', patched.json?.item?.status === 'in_progress', patched.json?.item?.status);

  const badStatus = await call(`/api/items/${secondId}`, {
    method: 'PATCH',
    headers: jsonHeaders(cookie),
    body: JSON.stringify({ status: 'nearly there' }),
  });
  check('P7 unknown status is rejected', badStatus.status === 400 || badStatus.status === 422, `status ${badStatus.status}`);

  const renamed = await call(`/api/items/${secondId}`, {
    method: 'PATCH',
    headers: jsonHeaders(cookie),
    body: JSON.stringify({ title: 'Brand guide' }),
  });
  check('P5 title edit persists', renamed.json?.item?.title === 'Brand guide');

  const deleted = await call(`/api/projects/${projectId}/items`, {
    method: 'POST',
    headers: jsonHeaders(cookie),
    body: JSON.stringify({ title: 'Print pack' }),
  });
  const deletedId = deleted.json?.item?.id;
  const removed = await call(`/api/items/${deletedId}`, { method: 'DELETE', headers: jsonHeaders(cookie) });
  check('P9 deliverable is deleted', removed.status === 200 || removed.status === 204, `status ${removed.status}`);

  // ---- share link ----
  const share = await call(`/api/projects/${projectId}/share`, {
    method: 'POST',
    headers: jsonHeaders(cookie),
    body: '{}',
  });
  const shareUrl = share.json?.share?.url;
  check('S1 client link is created', typeof shareUrl === 'string' && shareUrl.includes('/s/'), shareUrl?.slice(0, 60));

  if (!shareUrl) {
    console.log(`\n${pass} passed, ${fail} failed`);
    console.log('Stopped: no client link, later checks depend on it');
    process.exit(1);
  }

  const publicPage = await fetch(shareUrl);
  const publicHtml = await publicPage.text();
  check('S2 client page loads without a session', publicPage.status === 200, `status ${publicPage.status}`);
  check('S3 client page shows the deliverables', publicHtml.includes('Brand guide') && publicHtml.includes('Logo'));
  check('S4 client page hides the internal note', !publicHtml.includes('Written by the production check'));
  check('S4 client page carries no account email', !publicHtml.includes(email));

  const sharedPath = new URL(shareUrl).pathname;
  const writeAttempt = await fetch(BASE + sharedPath, { method: 'POST', body: '{}' });
  check('S5 client page rejects writes', writeAttempt.status === 405, `status ${writeAttempt.status}`);

  const revoked = await call(`/api/projects/${projectId}/share`, {
    method: 'DELETE',
    headers: jsonHeaders(cookie),
  });
  check('S6 link is revoked', revoked.status === 200 || revoked.status === 204, `status ${revoked.status}`);
  const afterRevoke = await fetch(shareUrl);
  check('S6 revoked link returns 410', afterRevoke.status === 410, `status ${afterRevoke.status}`);

  const unknown = await fetch(BASE + '/s/' + 'a'.repeat(32));
  check('S7 unknown token returns 404', unknown.status === 404, `status ${unknown.status}`);

  // ---- isolation ----
  const otherEmail = `intruder.${stamp}@clientroom.test`;
  const other = await call('/api/auth/signup', {
    method: 'POST',
    headers: jsonHeaders(null),
    body: JSON.stringify({ email: otherEmail, password }),
  });
  const otherCookie = cookieFrom(other);
  const intruder = await call(`/api/projects/${projectId}`, { headers: jsonHeaders(otherCookie) });
  check('A7 other account cannot read the project', intruder.status === 404, `status ${intruder.status}`);
  const intruderList = await call('/api/projects', { headers: jsonHeaders(otherCookie) });
  check('A7 other account list is empty', (intruderList.json?.projects ?? []).length === 0);

  // ---- MCP credential ----
  const credential = await call('/api/mcp-credential', {
    method: 'POST',
    headers: jsonHeaders(cookie),
    body: '{}',
  });
  const token = credential.json?.token ?? credential.json?.credential?.token;
  check('C1 credential is revealed once', typeof token === 'string' && token.length > 20);

  const later = await call('/api/me', { headers: jsonHeaders(cookie) });
  const profile = JSON.stringify(later.json ?? {});
  const prefix = later.json?.user?.mcp?.prefix;
  check(
    'C1 later reads show only a prefix',
    typeof prefix === 'string' && prefix.length < token.length && !profile.includes(token),
    prefix,
  );

  // ---- MCP protocol and tools ----
  const init = await rpc(token, {
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'production-check', version: '1' } },
  });
  check('M2 initialize returns a protocol version', Boolean(init.json?.result?.protocolVersion), init.json?.result?.protocolVersion);

  const list = await rpc(token, { jsonrpc: '2.0', id: 2, method: 'tools/list' });
  const names = (list.json?.result?.tools ?? []).map((tool) => tool.name).sort();
  check(
    'M3 exactly five tools are listed',
    JSON.stringify(names) ===
      JSON.stringify(['create_item', 'create_project', 'get_project', 'list_projects', 'update_item']),
    names.join(','),
  );

  const mcpProject = await rpc(token, {
    jsonrpc: '2.0',
    id: 3,
    method: 'tools/call',
    params: { name: 'create_project', arguments: { title: 'Made through MCP', description: 'Production check.' } },
  });
  const mcpProjectText = mcpProject.json?.result?.content?.[0]?.text ?? '';
  const mcpProjectId = JSON.parse(mcpProjectText || '{}')?.project?.id;
  check('M4 create_project works over HTTPS', Boolean(mcpProjectId));

  const mcpItem = await rpc(token, {
    jsonrpc: '2.0',
    id: 4,
    method: 'tools/call',
    params: {
      name: 'create_item',
      arguments: { project_id: mcpProjectId, title: 'Discovery workshop', status: 'done', due_date: '2026-11-10' },
    },
  });
  const mcpItemText = mcpItem.json?.result?.content?.[0]?.text ?? '';
  const mcpItemId = JSON.parse(mcpItemText || '{}')?.item?.id;
  check('M4 create_item works over HTTPS', Boolean(mcpItemId));

  const mcpUpdate = await rpc(token, {
    jsonrpc: '2.0',
    id: 5,
    method: 'tools/call',
    params: { name: 'update_item', arguments: { id: mcpItemId, status: 'blocked' } },
  });
  check(
    'M4 update_item works over HTTPS',
    JSON.parse(mcpUpdate.json?.result?.content?.[0]?.text ?? '{}')?.item?.status === 'blocked',
  );

  const mcpGet = await rpc(token, {
    jsonrpc: '2.0',
    id: 6,
    method: 'tools/call',
    params: { name: 'get_project', arguments: { id: mcpProjectId } },
  });
  const mcpGetBody = JSON.parse(mcpGet.json?.result?.content?.[0]?.text ?? '{}');
  check('M5 get_project returns the project with items', mcpGetBody?.items?.length === 1);

  const mcpList = await rpc(token, {
    jsonrpc: '2.0',
    id: 7,
    method: 'tools/call',
    params: { name: 'list_projects', arguments: {} },
  });
  const listed = JSON.parse(mcpList.json?.result?.content?.[0]?.text ?? '{}')?.projects ?? [];
  check('M5 list_projects returns both projects', listed.length === 2, `${listed.length} projects`);

  const badArgs = await rpc(token, {
    jsonrpc: '2.0',
    id: 8,
    method: 'tools/call',
    params: { name: 'create_item', arguments: { title: 'No project id' } },
  });
  check('M6 invalid arguments return -32602', badArgs.json?.error?.code === -32602, `code ${badArgs.json?.error?.code}`);

  const unknownMethod = await rpc(token, { jsonrpc: '2.0', id: 9, method: 'tools/nope' });
  check('M7 unknown method returns -32601', unknownMethod.json?.error?.code === -32601, `code ${unknownMethod.json?.error?.code}`);

  const missing = await rpc(token, {
    jsonrpc: '2.0',
    id: 10,
    method: 'tools/call',
    params: { name: 'get_project', arguments: { id: 'does-not-exist' } },
  });
  check('M8 missing record is a tool error, not a protocol error', missing.json?.result?.isError === true);

  const rotated = await call('/api/mcp-credential/regenerate', {
    method: 'POST',
    headers: jsonHeaders(cookie),
    body: '{}',
  });
  const newToken = rotated.json?.token ?? rotated.json?.credential?.token;
  check('C3 credential is regenerated', typeof newToken === 'string' && newToken !== token);

  const oldTokenAttempt = await fetch(BASE + '/mcp', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}`, accept: 'application/json, text/event-stream' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 11, method: 'tools/list' }),
  });
  check('C3 the old token stops working', oldTokenAttempt.status === 401, `status ${oldTokenAttempt.status}`);

  // ---- signs of life in the browser ----
  const spaRoute = await fetch(BASE + '/projects/' + projectId);
  check('Q1 app routes serve the shell', spaRoute.status === 200);

  await writeFile(
    STATE,
    JSON.stringify({ email, password, projectId, mcpProjectId, itemId: secondId, newToken, at: new Date().toISOString() }, null, 2),
  );

  console.log(`\n${pass} passed, ${fail} failed`);
  if (fail > 0) {
    console.log('Failed: ' + failures.join(', '));
    process.exit(1);
  }
}

await main();
