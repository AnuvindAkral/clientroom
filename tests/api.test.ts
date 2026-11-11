import { beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { createApp } from '../src/app.js';
import { useTestDb } from '../src/db/index.js';
import { resetRateLimits } from '../src/middleware/rateLimit.js';

let app: Express;

beforeEach(() => {
  useTestDb();
  resetRateLimits();
  app = createApp();
});

async function signup(email = 'ana@studio.test', password = 'correct-horse') {
  const agent = request.agent(app);
  const res = await agent.post('/api/auth/signup').send({ email, password });
  expect(res.status).toBe(201);
  return agent;
}

describe('auth', () => {
  it('A1 creates an account and a session', async () => {
    const agent = request.agent(app);
    const res = await agent
      .post('/api/auth/signup')
      .send({ email: 'ana@studio.test', password: 'correct-horse' });
    expect(res.status).toBe(201);
    expect(String(res.headers['set-cookie'])).toContain('HttpOnly');

    const me = await agent.get('/api/me');
    expect(me.status).toBe(200);
    expect(me.body.user.email).toBe('ana@studio.test');
  });

  it('A2 rejects a duplicate email', async () => {
    await signup();
    const res = await request(app)
      .post('/api/auth/signup')
      .send({ email: 'ANA@studio.test', password: 'correct-horse' });
    expect(res.status).toBe(409);
    expect(res.body.error.fields.email).toMatch(/already/i);
  });

  it('A3 rejects a short password before creating a user', async () => {
    const res = await request(app)
      .post('/api/auth/signup')
      .send({ email: 'short@studio.test', password: 'short' });
    expect(res.status).toBe(422);
    expect(res.body.error.fields.password).toMatch(/8 characters/i);
  });

  it('A5 rejects a wrong password without revealing which field failed', async () => {
    await signup();
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'ana@studio.test', password: 'wrong-horse' });
    expect(res.status).toBe(401);
    expect(res.body.error.message).toBe('Email or password is incorrect.');
  });

  it('A6 rejects a tampered session cookie', async () => {
    const agent = request.agent(app);
    const signupRes = await agent
      .post('/api/auth/signup')
      .send({ email: 'ana@studio.test', password: 'correct-horse' });
    const raw = signupRes.headers['set-cookie'];
    const cookie = Array.isArray(raw) ? raw[0] : raw;
    expect(cookie).toBeTruthy();
    const tampered = String(cookie).replace(/cr_session=([^;]+)/, (_m, value: string) => {
      const [payload, signature] = value.split('.');
      return `cr_session=${payload}x.${signature}`;
    });
    const res = await request(app).get('/api/me').set('Cookie', tampered);
    expect(res.status).toBe(401);
  });
});

describe('projects and deliverables', () => {
  it('P1 rejects a blank title', async () => {
    const agent = await signup();
    const res = await agent.post('/api/projects').send({ title: '  ' });
    expect(res.status).toBe(422);
  });

  it('P2 creates and lists a project', async () => {
    const agent = await signup();
    const created = await agent.post('/api/projects').send({
      title: 'Acme brand refresh',
      description: 'Internal note',
    });
    expect(created.status).toBe(201);

    const list = await agent.get('/api/projects');
    expect(list.body.projects).toHaveLength(1);
    expect(list.body.projects[0].title).toBe('Acme brand refresh');
    expect(list.body.projects[0].totalItems).toBe(0);
  });

  it('P3 updates a project title and bumps updated_at', async () => {
    const agent = await signup();
    const created = await agent.post('/api/projects').send({ title: 'Acme' });
    const id = created.body.project.id as string;
    const patched = await agent.patch(`/api/projects/${id}`).send({ title: 'Acme rebrand' });
    expect(patched.status).toBe(200);
    expect(patched.body.project.title).toBe('Acme rebrand');
    expect(patched.body.project.updatedAt >= created.body.project.updatedAt).toBe(true);
  });

  it('P4-P6 creates a deliverable and normalises status synonyms', async () => {
    const agent = await signup();
    const project = await agent.post('/api/projects').send({ title: 'Acme' });
    const id = project.body.project.id as string;

    const created = await agent.post(`/api/projects/${id}/items`).send({
      title: 'Logo',
      status: 'In progress',
      due_date: '2026-12-01',
    });
    expect(created.status).toBe(201);
    expect(created.body.item.status).toBe('in_progress');
    expect(created.body.item.dueDate).toBe('2026-12-01');

    const updated = await agent
      .patch(`/api/items/${created.body.item.id}`)
      .send({ status: 'complete' });
    expect(updated.status).toBe(200);
    expect(updated.body.item.status).toBe('done');
  });

  it('P7 rejects an unknown status and lists allowed values', async () => {
    const agent = await signup();
    const project = await agent.post('/api/projects').send({ title: 'Acme' });
    const res = await agent.post(`/api/projects/${project.body.project.id}/items`).send({
      title: 'Logo',
      status: 'nearly done',
    });
    expect(res.status).toBe(422);
    expect(res.body.error.fields.status).toMatch(/not_started/);
  });

  it('P8 rejects a malformed date', async () => {
    const agent = await signup();
    const project = await agent.post('/api/projects').send({ title: 'Acme' });
    const res = await agent.post(`/api/projects/${project.body.project.id}/items`).send({
      title: 'Logo',
      due_date: '2026-02-31',
    });
    expect(res.status).toBe(422);
    expect(res.body.error.fields.due_date).toMatch(/YYYY-MM-DD/);
  });

  it('P9 deletes a deliverable', async () => {
    const agent = await signup();
    const project = await agent.post('/api/projects').send({ title: 'Acme' });
    const item = await agent
      .post(`/api/projects/${project.body.project.id}/items`)
      .send({ title: 'Logo' });
    const del = await agent.delete(`/api/items/${item.body.item.id}`);
    expect(del.status).toBe(204);
    const detail = await agent.get(`/api/projects/${project.body.project.id}`);
    expect(detail.body.items).toHaveLength(0);
  });

  it('P10 counts total and done deliverables', async () => {
    const agent = await signup();
    const project = await agent.post('/api/projects').send({ title: 'Acme' });
    const id = project.body.project.id as string;
    await agent.post(`/api/projects/${id}/items`).send({ title: 'Logo', status: 'done' });
    await agent.post(`/api/projects/${id}/items`).send({ title: 'Guide', status: 'in_progress' });
    const list = await agent.get('/api/projects');
    expect(list.body.projects[0].totalItems).toBe(2);
    expect(list.body.projects[0].doneItems).toBe(1);
  });
});

describe('isolation', () => {
  it('A7-A8 hides another user project behind a 404', async () => {
    const ana = await signup('ana@studio.test');
    const ben = await signup('ben@studio.test');

    const project = await ana.post('/api/projects').send({ title: 'Ana client' });
    const id = project.body.project.id as string;

    expect((await ben.get(`/api/projects/${id}`)).status).toBe(404);
    expect((await ben.patch(`/api/projects/${id}`).send({ title: 'Hijack' })).status).toBe(404);
    expect((await ben.post(`/api/projects/${id}/items`).send({ title: 'Hijack' })).status).toBe(404);
    expect((await ben.get('/api/projects')).body.projects).toHaveLength(0);
  });

  it('A9 rejects a mutating request from a foreign origin', async () => {
    const agent = await signup();
    const res = await agent
      .post('/api/projects')
      .set('Origin', 'https://evil.example')
      .send({ title: 'Acme' });
    expect(res.status).toBe(403);
  });

  it('S8 stops another user creating or revoking a share link', async () => {
    const ana = await signup('ana@studio.test');
    const ben = await signup('ben@studio.test');
    const project = await ana.post('/api/projects').send({ title: 'Ana client' });
    const id = project.body.project.id as string;

    expect((await ben.post(`/api/projects/${id}/share`)).status).toBe(404);
    expect((await ben.delete(`/api/projects/${id}/share`)).status).toBe(404);
  });
});

describe('share links', () => {
  it('S1-S5 serves a read-only page without a session', async () => {
    const agent = await signup();
    const project = await agent.post('/api/projects').send({
      title: 'Acme brand refresh',
      description: 'Internal only note',
    });
    const id = project.body.project.id as string;
    await agent.post(`/api/projects/${id}/items`).send({ title: 'Logo', status: 'done' });

    const share = await agent.post(`/api/projects/${id}/share`);
    expect(share.status).toBe(201);
    const url = share.body.share.url as string;
    const path = new URL(url).pathname;

    const page = await request(app).get(path);
    expect(page.status).toBe(200);
    expect(page.text).toContain('Acme brand refresh');
    expect(page.text).toContain('Logo');
    expect(page.text).toContain('Done');
    expect(page.text).not.toContain('Internal only note');
    expect(page.text).not.toContain('ana@studio.test');
    expect(page.text).toContain('noindex');

    // No write method is exposed.
    expect((await request(app).post(path)).status).toBe(404);
  });

  it('S6 revokes immediately and returns 410', async () => {
    const agent = await signup();
    const project = await agent.post('/api/projects').send({ title: 'Acme' });
    const id = project.body.project.id as string;
    const share = await agent.post(`/api/projects/${id}/share`);
    const path = new URL(share.body.share.url).pathname;

    expect((await request(app).get(path)).status).toBe(200);
    expect((await agent.delete(`/api/projects/${id}/share`)).status).toBe(204);
    expect((await request(app).get(path)).status).toBe(410);
  });

  it('S7 returns 404 for an unknown token', async () => {
    const res = await request(app).get('/s/not-a-real-token');
    expect(res.status).toBe(404);
  });

  it('returns the active link so the owner can copy it again', async () => {
    const agent = await signup();
    const project = await agent.post('/api/projects').send({ title: 'Acme' });
    const id = project.body.project.id as string;
    const created = await agent.post(`/api/projects/${id}/share`);
    const active = await agent.get(`/api/projects/${id}/share`);
    expect(active.body.share.url).toBe(created.body.share.url);
  });

  it('creating a new link revokes the previous one', async () => {
    const agent = await signup();
    const project = await agent.post('/api/projects').send({ title: 'Acme' });
    const id = project.body.project.id as string;
    const first = await agent.post(`/api/projects/${id}/share`);
    const second = await agent.post(`/api/projects/${id}/share`);
    const firstPath = new URL(first.body.share.url).pathname;
    const secondPath = new URL(second.body.share.url).pathname;
    expect((await request(app).get(firstPath)).status).toBe(410);
    expect((await request(app).get(secondPath)).status).toBe(200);
  });
});

describe('mcp credentials', () => {
  it('C1-C2 reveals the token once and stores only a hash', async () => {
    const agent = await signup();
    const created = await agent.post('/api/mcp-credential');
    expect(created.status).toBe(201);
    expect(created.body.credential.token).toMatch(/^crm_/);

    const me = await agent.get('/api/me');
    expect(me.body.user.mcp.prefix).toBe(created.body.credential.token.slice(0, 12));
    expect(JSON.stringify(me.body)).not.toContain(created.body.credential.token);

    const second = await agent.post('/api/mcp-credential');
    expect(second.status).toBe(409);
  });

  it('C3-C4 rotates and revokes a credential', async () => {
    const agent = await signup();
    const first = (await agent.post('/api/mcp-credential')).body.credential.token as string;
    const rotated = await agent.post('/api/mcp-credential/regenerate');
    const second = rotated.body.credential.token as string;
    expect(second).not.toBe(first);

    expect((await agent.delete('/api/mcp-credential')).status).toBe(204);
    const me = await agent.get('/api/me');
    expect(me.body.user.mcp).toBeNull();
  });
});
