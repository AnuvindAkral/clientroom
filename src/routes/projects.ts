import { Router } from 'express';
import { config } from '../config.js';
import { parse } from '../lib/http.js';
import { createItemSchema, createProjectSchema, updateProjectSchema } from '../lib/validation.js';
import { createProject, getProjectWithItems, listProjects, updateProject } from '../services/projects.js';
import { createItem } from '../services/items.js';
import { createShareLink, getActiveShareUrl, revokeShareLink } from '../services/share.js';
import { notFound } from '../lib/errors.js';

const router = Router();

router.get('/', (req, res) => {
  res.json({ projects: listProjects(req.user!.id) });
});

router.post('/', (req, res) => {
  const body = parse(createProjectSchema, req.body);
  const project = createProject(req.user!.id, body.title, body.description);
  res.status(201).json({ project });
});

router.get('/:id', (req, res) => {
  const result = getProjectWithItems(req.user!.id, req.params.id);
  if (!result) throw notFound('Project');
  res.json(result);
});

router.patch('/:id', (req, res) => {
  const body = parse(updateProjectSchema, req.body);
  const project = updateProject(req.user!.id, req.params.id, body);
  if (!project) throw notFound('Project');
  res.json({ project });
});

router.post('/:id/items', (req, res) => {
  const body = parse(createItemSchema, { ...req.body, project_id: req.params.id });
  const item = createItem(req.user!.id, req.params.id, {
    title: body.title,
    status: body.status,
    dueDate: body.due_date ?? null,
  });
  if (!item) throw notFound('Project');
  res.status(201).json({ item });
});

router.get('/:id/share', (req, res) => {
  const path = getActiveShareUrl(req.user!.id, req.params.id);
  if (path === null) {
    res.json({ share: null });
    return;
  }
  res.json({ share: { url: `${config.appOrigin}${path}` } });
});

router.post('/:id/share', (req, res) => {
  const result = createShareLink(req.user!.id, req.params.id);
  if (!result) throw notFound('Project');
  res.status(201).json({
    share: { url: `${config.appOrigin}/s/${result.rawToken}`, createdAt: result.link.createdAt },
  });
});

router.delete('/:id/share', (req, res) => {
  const revoked = revokeShareLink(req.user!.id, req.params.id);
  if (!revoked) throw notFound('Share link');
  res.status(204).end();
});

export default router;
