import { Router } from 'express';
import { parse } from '../lib/http.js';
import { updateItemSchema } from '../lib/validation.js';
import { deleteItem, updateItem } from '../services/items.js';
import { notFound } from '../lib/errors.js';

const router = Router();

router.patch('/:id', (req, res) => {
  const body = parse(updateItemSchema, req.body);
  const item = updateItem(req.user!.id, req.params.id, {
    title: body.title,
    status: body.status,
    dueDate: body.due_date === undefined ? undefined : body.due_date,
  });
  if (!item) throw notFound('Deliverable');
  res.json({ item });
});

router.delete('/:id', (req, res) => {
  const deleted = deleteItem(req.user!.id, req.params.id);
  if (!deleted) throw notFound('Deliverable');
  res.status(204).end();
});

export default router;
