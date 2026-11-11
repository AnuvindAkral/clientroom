import type { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import { AppError } from '../lib/errors.js';
import { logger } from '../lib/logger.js';

export function requestContext(req: Request, res: Response, next: NextFunction): void {
  req.requestId = randomUUID();
  res.setHeader('X-Request-Id', req.requestId);
  const started = process.hrtime.bigint();

  res.on('finish', () => {
    const ms = Number(process.hrtime.bigint() - started) / 1e6;
    logger.info('request', {
      requestId: req.requestId,
      method: req.method,
      path: req.path,
      status: res.statusCode,
      durationMs: Math.round(ms * 10) / 10,
    });
  });

  next();
}

export function apiNotFound(_req: Request, res: Response): void {
  res.status(404).json({ error: { code: 'not_found', message: 'No such endpoint.' } });
}

export function errorHandler(
  error: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (error instanceof AppError) {
    res.status(error.status).json({
      error: { code: error.code, message: error.message, fields: error.fields },
    });
    return;
  }

  // express.json raises a 400 SyntaxError for malformed bodies.
  if (
    error instanceof SyntaxError &&
    'status' in error &&
    (error as SyntaxError & { status?: number }).status === 400
  ) {
    res.status(400).json({ error: { code: 'invalid_json', message: 'The request body is not valid JSON.' } });
    return;
  }

  logger.error('unhandled error', {
    requestId: req.requestId,
    path: req.path,
    error: error instanceof Error ? error.message : String(error),
  });

  if (res.headersSent) return;
  res.status(500).json({ error: { code: 'internal_error', message: 'Something went wrong. Try again.' } });
}
