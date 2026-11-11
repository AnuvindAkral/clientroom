import type { NextFunction, Request, Response } from 'express';
import { config } from '../config.js';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * SameSite=Lax blocks most cross-site form posts, but a same-site subdomain or
 * an older browser can still try. Mutations must come from the app origin.
 */
export function checkOrigin(req: Request, res: Response, next: NextFunction): void {
  if (SAFE_METHODS.has(req.method)) {
    next();
    return;
  }

  const origin = req.headers.origin;
  if (!origin) {
    // Non-browser clients such as curl and the MCP transport do not send Origin.
    next();
    return;
  }

  const allowed = new Set<string>([config.appOrigin]);
  const host = req.headers.host;
  if (host) {
    allowed.add(`http://${host}`);
    allowed.add(`https://${host}`);
  }

  if (!allowed.has(origin)) {
    res.status(403).json({ error: { code: 'forbidden_origin', message: 'Request origin is not allowed.' } });
    return;
  }
  next();
}
