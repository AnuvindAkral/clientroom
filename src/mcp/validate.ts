import { toolValidators } from './schemas.js';

interface RpcEnvelope {
  jsonrpc?: unknown;
  id?: unknown;
  method?: unknown;
  params?: unknown;
}

export interface RpcError {
  code: number;
  message: string;
}

/**
 * Returns a JSON-RPC error when a tools/call request is malformed, otherwise
 * null. Runs before the SDK so invalid arguments stay in the protocol error
 * channel instead of becoming tool results.
 */
export function validateToolCall(body: unknown): RpcError | null {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) return null;
  const envelope = body as RpcEnvelope;
  if (envelope.method !== 'tools/call') return null;

  const params = envelope.params;
  if (typeof params !== 'object' || params === null) {
    return { code: -32602, message: 'Invalid params: params.name is required.' };
  }

  const { name, arguments: args } = params as { name?: unknown; arguments?: unknown };
  if (typeof name !== 'string') {
    return { code: -32602, message: 'Invalid params: params.name is required.' };
  }

  if (!(name in toolValidators)) {
    return { code: -32602, message: `Unknown tool: ${name}.` };
  }

  const validator = toolValidators[name as keyof typeof toolValidators];
  const result = validator.safeParse(args ?? {});
  if (result.success) return null;

  const issues = result.error.issues
    .map((issue) => {
      const path = issue.path.join('.');
      return path ? `${path}: ${issue.message}` : issue.message;
    })
    .join('; ');

  return { code: -32602, message: `Invalid arguments for ${name}: ${issues}` };
}
