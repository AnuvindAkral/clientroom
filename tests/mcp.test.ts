import { beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { createApp } from '../src/app.js';
import { useTestDb } from '../src/db/index.js';
import { resetRateLimits } from '../src/middleware/rateLimit.js';

let app: Express;
let token: string;
let otherToken: string;

beforeEach(async () => {
  useTestDb();
  resetRateLimits();
  app = createApp();
  token = await credentialFor('ana@studio.test');
  otherToken = await credentialFor('ben@studio.test');
});

async function credentialFor(email: string): Promise<string> {
  const agent = request.agent(app);
  const res = await agent.post('/api/auth/signup').send({ email, password: 'correct-horse' });
  expect(res.status).toBe(201);
  const cred = await agent.post('/api/mcp-credential');
  expect(cred.status).toBe(201);
  return cred.body.credential.token as string;
}

let nextId = 1;

async function rpc(payload: unknown, bearer = token) {
  const res = await request(app)
    .post('/mcp')
    .set('Authorization', `Bearer ${bearer}`)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json, text/event-stream')
    .send(JSON.stringify(payload));
  return res;
}

async function callTool(name: string, args: Record<string, unknown>, bearer = token) {
  return rpc(
    { jsonrpc: '2.0', id: nextId++, method: 'tools/call', params: { name, arguments: args } },
    bearer,
  );
}

function textOf(res: request.Response): string {
  return (res.body.result?.content?.[0]?.text as string) ?? '';
}

describe('MCP transport and authentication', () => {
  it('M1 rejects a request without a bearer token', async () => {
    const res = await request(app)
      .post('/mcp')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' }));
    expect(res.status).toBe(401);
    expect(res.headers['www-authenticate']).toContain('Bearer');
  });

  it('M1 rejects an invalid bearer token', async () => {
    const res = await rpc({ jsonrpc: '2.0', id: 1, method: 'tools/list' }, 'crm_not_a_real_token');
    expect(res.status).toBe(401);
  });

  it('M9 returns 405 for GET and DELETE', async () => {
    const get = await request(app).get('/mcp').set('Authorization', `Bearer ${token}`);
    expect(get.status).toBe(405);
    expect(get.headers.allow).toBe('POST');
    const del = await request(app).delete('/mcp').set('Authorization', `Bearer ${token}`);
    expect(del.status).toBe(405);
  });

  it('returns -32700 for a malformed body', async () => {
    const res = await request(app)
      .post('/mcp')
      .set('Authorization', `Bearer ${token}`)
      .set('Content-Type', 'application/json')
      .send('{not json');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe(-32700);
  });
});

describe('MCP protocol', () => {
  it('M2 completes initialize', async () => {
    const res = await rpc({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2025-06-18',
        capabilities: {},
        clientInfo: { name: 'vitest', version: '1.0.0' },
      },
    });
    expect(res.status).toBe(200);
    expect(res.body.jsonrpc).toBe('2.0');
    expect(res.body.result.protocolVersion).toBeTypeOf('string');
    expect(res.body.result.serverInfo.name).toBe('clientroom');
  });

  it('M3 lists exactly five tools with schemas', async () => {
    const res = await rpc({ jsonrpc: '2.0', id: 2, method: 'tools/list' });
    expect(res.status).toBe(200);
    const tools = res.body.result.tools as Array<{ name: string; inputSchema: unknown }>;
    expect(tools.map((tool) => tool.name).sort()).toEqual([
      'create_item',
      'create_project',
      'get_project',
      'list_projects',
      'update_item',
    ]);
    for (const tool of tools) expect(tool.inputSchema).toBeTruthy();
  });

  it('M7 returns -32601 for an unknown method', async () => {
    const res = await rpc({ jsonrpc: '2.0', id: 3, method: 'tools/nope' });
    expect(res.body.error.code).toBe(-32601);
  });

  it('M6 returns -32602 for missing required parameters', async () => {
    const res = await callTool('create_project', { description: 'no title' });
    expect(res.body.error.code).toBe(-32602);
  });
});

describe('MCP tools', () => {
  it('M4 creates a project and a deliverable that persist', async () => {
    const created = await callTool('create_project', {
      title: 'Acme brand refresh',
      description: 'From Claude',
    });
    expect(created.body.error).toBeUndefined();
    const project = JSON.parse(textOf(created)).project as { id: string; title: string };
    expect(project.title).toBe('Acme brand refresh');

    const item = await callTool('create_item', {
      project_id: project.id,
      title: 'Brand guide',
      status: 'in progress',
      due_date: '2026-12-01',
    });
    expect(item.body.error).toBeUndefined();
    const parsedItem = JSON.parse(textOf(item)).item as { status: string; due_date: string };
    expect(parsedItem.status).toBe('in_progress');
    expect(parsedItem.due_date).toBe('2026-12-01');

    // Visible through the human API as well.
    const agent = request.agent(app);
    await agent
      .post('/api/auth/login')
      .send({ email: 'ana@studio.test', password: 'correct-horse' });
    const detail = await agent.get(`/api/projects/${project.id}`);
    expect(detail.body.items).toHaveLength(1);
  });

  it('M5 returns a project with its items and supports update', async () => {
    const created = await callTool('create_project', { title: 'Northwind' });
    const id = JSON.parse(textOf(created)).project.id as string;
    const item = await callTool('create_item', { project_id: id, title: 'Logo' });
    const itemId = JSON.parse(textOf(item)).item.id as string;

    const updated = await callTool('update_item', { id: itemId, status: 'done' });
    expect(JSON.parse(textOf(updated)).item.status).toBe('done');

    const fetched = await callTool('get_project', { id });
    const payload = JSON.parse(textOf(fetched)) as {
      project: { id: string };
      items: Array<{ status: string }>;
    };
    expect(payload.project.id).toBe(id);
    expect(payload.items[0]!.status).toBe('done');

    const list = await callTool('list_projects', {});
    const projects = JSON.parse(textOf(list)).projects as Array<{ item_count: number }>;
    expect(projects).toHaveLength(1);
    expect(projects[0]!.item_count).toBe(1);
  });

  it('M8 reports a missing record as a tool error, not a protocol error', async () => {
    const res = await callTool('get_project', { id: '00000000-0000-0000-0000-000000000000' });
    expect(res.body.error).toBeUndefined();
    expect(res.body.result.isError).toBe(true);
    expect(res.body.result.content[0].text).toMatch(/not found or unauthorized/i);
  });

  it('C6 keeps credentials isolated', async () => {
    const created = await callTool('create_project', { title: 'Ana only' });
    const id = JSON.parse(textOf(created)).project.id as string;

    const stolen = await callTool('get_project', { id }, otherToken);
    expect(stolen.body.result.isError).toBe(true);

    const otherList = await callTool('list_projects', {}, otherToken);
    expect(JSON.parse(textOf(otherList)).projects).toHaveLength(0);
  });

  it('C3 stops a rotated credential from working', async () => {
    const agent = request.agent(app);
    await agent
      .post('/api/auth/login')
      .send({ email: 'ana@studio.test', password: 'correct-horse' });
    const rotated = await agent.post('/api/mcp-credential/regenerate');
    const fresh = rotated.body.credential.token as string;
    expect(fresh).not.toBe(token);

    const old = await rpc({ jsonrpc: '2.0', id: 9, method: 'tools/list' }, token);
    expect(old.status).toBe(401);
    const current = await rpc({ jsonrpc: '2.0', id: 10, method: 'tools/list' }, fresh);
    expect(current.status).toBe(200);
  });
});
