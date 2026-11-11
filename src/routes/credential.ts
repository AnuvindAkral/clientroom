import { Router } from 'express';
import { config } from '../config.js';
import { issueCredential, revokeCredential } from '../services/credential.js';
import { rateLimit } from '../middleware/rateLimit.js';
import { conflict } from '../lib/errors.js';

const router = Router();

const limiter = rateLimit({ windowMs: 60_000, max: 10 });

router.post('/', limiter, (req, res) => {
  if (req.user!.mcpTokenPrefix !== null) {
    throw conflict('A credential already exists. Regenerate it instead.');
  }
  const credential = issueCredential(req.user!.id);
  res.status(201).json({
    credential: {
      token: credential.raw,
      prefix: credential.prefix,
      createdAt: credential.createdAt,
      url: `${config.appOrigin}/mcp`,
    },
    notice: 'Copy this token now. It is not shown again.',
  });
});

router.post('/regenerate', limiter, (req, res) => {
  if (req.user!.mcpTokenPrefix === null) {
    throw conflict('Create a credential first.');
  }
  const credential = issueCredential(req.user!.id);
  res.json({
    credential: {
      token: credential.raw,
      prefix: credential.prefix,
      createdAt: credential.createdAt,
      url: `${config.appOrigin}/mcp`,
    },
    notice: 'The previous token no longer works. Copy this one now.',
  });
});

router.delete('/', (req, res) => {
  revokeCredential(req.user!.id);
  res.status(204).end();
});

export default router;
