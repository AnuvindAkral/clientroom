import express from 'express';
import helmet from 'helmet';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { config } from './config.js';
import { logger } from './lib/logger.js';
import { attachUser, requireUser } from './middleware/auth.js';
import { checkOrigin } from './middleware/origin.js';
import { apiNotFound, errorHandler, requestContext } from './middleware/errors.js';
import authRoutes from './routes/auth.js';
import projectRoutes from './routes/projects.js';
import itemRoutes from './routes/items.js';
import credentialRoutes from './routes/credential.js';
import { createMcpServerForUser } from './mcp/server.js';
import { validateToolCall } from './mcp/validate.js';
import { authenticateMcpRequest } from './services/credential.js';
import { resolveShareToken } from './services/share.js';
import { renderSharePage } from './web/sharePage.js';
import { pingDb } from './db/index.js';

export function createApp(): express.Express {
  const app = express();
  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
          fontSrc: ["'self'", 'https://fonts.gstatic.com'],
          imgSrc: ["'self'", 'data:'],
          connectSrc: ["'self'"],
          frameAncestors: ["'none'"],
          baseUri: ["'self'"],
          formAction: ["'self'"],
        },
      },
      crossOriginEmbedderPolicy: false,
    }),
  );

  app.use(requestContext);
  app.use(attachUser);

  app.get('/healthz', (_req, res) => {
    const ok = pingDb();
    res.status(ok ? 200 : 503).json({ status: ok ? 'ok' : 'degraded', database: ok ? 'ok' : 'unavailable' });
  });

  // Public client view. Rendered on the server so it works without JavaScript
  // and can return a real 404 or 410.
  app.get('/s/:token', (req, res) => {
    const { status, html } = renderSharePage(resolveShareToken(req.params.token));
    res.status(status).type('html').send(html);
  });

  // A client link is read only. Say so instead of falling through to a 404.
  app.all('/s/:token', (_req, res) => {
    res.setHeader('Allow', 'GET');
    res.status(405).json({ error: { code: 'method_not_allowed', message: 'The client link is read only.' } });
  });

  // MCP over Streamable HTTP. Stateless: one server and transport per request,
  // so no in-memory session state and no sticky routing.
  const mcpText = express.text({ type: '*/*', limit: '1mb' });

  app.post('/mcp', mcpText, async (req, res) => {
    const header =
      (req.headers.authorization as string | undefined) ??
      (req.headers.authorization_token as string | undefined);
    const user = authenticateMcpRequest(header);

    if (!user) {
      res.setHeader('WWW-Authenticate', 'Bearer realm="clientroom"');
      res.status(401).json({
        jsonrpc: '2.0',
        id: null,
        error: { code: -32001, message: 'Unauthorized. Send Authorization: Bearer <token>.' },
      });
      return;
    }

    let body: unknown;
    const raw = typeof req.body === 'string' ? req.body : '';
    if (raw.trim().length === 0) {
      res.status(400).json({
        jsonrpc: '2.0',
        id: null,
        error: { code: -32700, message: 'Parse error: empty body.' },
      });
      return;
    }
    try {
      body = JSON.parse(raw);
    } catch {
      res.status(400).json({
        jsonrpc: '2.0',
        id: null,
        error: { code: -32700, message: 'Parse error: body is not valid JSON.' },
      });
      return;
    }

    const server = createMcpServerForUser(user);

    const invalid = validateToolCall(body);
    if (invalid) {
      res.status(200).json({
        jsonrpc: '2.0',
        id: (body as { id?: unknown }).id ?? null,
        error: invalid,
      });
      return;
    }

    const transport = new StreamableHTTPServerTransport({ enableJsonResponse: true });

    try {
      await server.connect(transport);
      await transport.handleRequest(req, res, body);
    } catch (error) {
      logger.error('mcp request failed', {
        requestId: req.requestId,
        error: error instanceof Error ? error.message : String(error),
      });
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: '2.0',
          id: null,
          error: { code: -32603, message: 'Internal error.' },
        });
      }
    } finally {
      await transport.close().catch(() => undefined);
      await server.close().catch(() => undefined);
    }
  });

  app.all('/mcp', (_req, res) => {
    res.setHeader('Allow', 'POST');
    res.status(405).json({
      jsonrpc: '2.0',
      id: null,
      error: { code: -32000, message: 'This endpoint accepts POST only.' },
    });
  });

  app.use(express.json({ limit: '64kb' }));
  app.use(checkOrigin);

  app.use('/api', authRoutes);
  app.use('/api/projects', requireUser, projectRoutes);
  app.use('/api/items', requireUser, itemRoutes);
  app.use('/api/mcp-credential', requireUser, credentialRoutes);
  app.use('/api', apiNotFound);

  const webDist = resolve(process.cwd(), 'web/dist');
  const indexFile = join(webDist, 'index.html');
  const hasBuild = existsSync(indexFile);

  if (hasBuild) {
    app.use(
      '/assets',
      express.static(join(webDist, 'assets'), {
        immutable: true,
        maxAge: '1y',
        fallthrough: false,
      }),
    );
    app.use(
      express.static(webDist, {
        index: false,
        setHeaders: (res, path) => {
          if (path.endsWith('index.html')) res.setHeader('Cache-Control', 'no-store');
        },
      }),
    );
  }

  app.use((req, res, next) => {
    if (req.method !== 'GET' || req.path.startsWith('/api')) {
      next();
      return;
    }
    if (!hasBuild) {
      res.status(503).type('text').send('The web build is missing. Run npm run build.');
      return;
    }
    res.setHeader('Cache-Control', 'no-store');
    res.sendFile(indexFile);
  });

  app.use(errorHandler);

  return app;
}
