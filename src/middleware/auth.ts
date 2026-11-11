import type { NextFunction, Request, Response } from 'express';
import { config } from '../config.js';
import { createSessionToken, readSessionToken } from '../lib/tokens.js';
import { findUserById } from '../services/users.js';
import type { User } from '../types.js';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: User;
      requestId?: string;
    }
  }
}

export function parseCookies(header: string | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(';')) {
    const index = part.indexOf('=');
    if (index < 1) continue;
    const key = part.slice(0, index).trim();
    const value = part.slice(index + 1).trim();
    if (!key) continue;
    try {
      out[key] = decodeURIComponent(value);
    } catch {
      out[key] = value;
    }
  }
  return out;
}

export function attachUser(req: Request, _res: Response, next: NextFunction): void {
  const cookies = parseCookies(req.headers.cookie);
  const userId = readSessionToken(cookies[config.sessionCookieName]);
  if (userId) {
    const user = findUserById(userId);
    if (user) req.user = user;
  }
  next();
}

export function requireUser(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ error: { code: 'unauthorized', message: 'Sign in to continue.' } });
    return;
  }
  next();
}

const cookieOptions = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: config.isProduction,
  path: '/',
};

export function setSessionCookie(res: Response, userId: string): void {
  res.cookie(config.sessionCookieName, createSessionToken(userId), {
    ...cookieOptions,
    maxAge: config.sessionTtlSeconds * 1000,
  });
}

export function clearSessionCookie(res: Response): void {
  res.clearCookie(config.sessionCookieName, cookieOptions);
}
