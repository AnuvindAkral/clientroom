import { Router } from 'express';
import { config } from '../config.js';
import { hashPassword, verifyPassword } from '../lib/password.js';
import { parse } from '../lib/http.js';
import { loginSchema, signupSchema } from '../lib/validation.js';
import { createUser, findUserByEmail } from '../services/users.js';
import { clearSessionCookie, requireUser, setSessionCookie } from '../middleware/auth.js';
import { rateLimit } from '../middleware/rateLimit.js';
import type { User } from '../types.js';

const router = Router();

const dummyHash = hashPassword('this-is-not-a-real-password');

const authLimiter = rateLimit({ windowMs: 60_000, max: 20 });

function publicUser(user: User) {
  return {
    id: user.id,
    email: user.email,
    createdAt: user.createdAt,
    mcp:
      user.mcpTokenPrefix === null
        ? null
        : { prefix: user.mcpTokenPrefix, createdAt: user.mcpTokenCreatedAt },
  };
}

router.post('/auth/signup', authLimiter, async (req, res) => {
  const body = parse(signupSchema, req.body);
  const passwordHash = await hashPassword(body.password);
  const user = createUser(body.email, passwordHash);
  setSessionCookie(res, user.id);
  res.status(201).json({
    user: publicUser(user),
    appOrigin: config.appOrigin,
    mcpUrl: `${config.appOrigin}/mcp`,
  });
});

router.post('/auth/login', authLimiter, async (req, res) => {
  const body = parse(loginSchema, req.body);
  const user = findUserByEmail(body.email);
  const hash = user?.passwordHash ?? (await dummyHash);
  const ok = await verifyPassword(body.password, hash);

  if (!user || !ok) {
    res.status(401).json({
      error: { code: 'invalid_credentials', message: 'Email or password is incorrect.' },
    });
    return;
  }

  setSessionCookie(res, user.id);
  res.json({
    user: publicUser(user),
    appOrigin: config.appOrigin,
    mcpUrl: `${config.appOrigin}/mcp`,
  });
});

router.post('/auth/logout', (_req, res) => {
  clearSessionCookie(res);
  res.status(204).end();
});

router.get('/me', requireUser, (req, res) => {
  res.json({
    user: publicUser(req.user!),
    appOrigin: config.appOrigin,
    mcpUrl: `${config.appOrigin}/mcp`,
  });
});

export default router;
