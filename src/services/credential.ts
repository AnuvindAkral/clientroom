import type { User } from '../types.js';
import { generateMcpToken, sha256 } from '../lib/tokens.js';
import { findUserById, findUserByMcpTokenHash, setMcpCredential, clearMcpCredential } from './users.js';

export function issueCredential(userId: string): {
  raw: string;
  prefix: string;
  createdAt: string;
} {
  const token = generateMcpToken();
  const createdAt = setMcpCredential(userId, token.hash, token.prefix);
  return { raw: token.raw, prefix: token.prefix, createdAt };
}

export function revokeCredential(userId: string): void {
  clearMcpCredential(userId);
}

export function authenticateMcpRequest(authorization: string | undefined): User | null {
  if (!authorization) return null;
  const match = /^Bearer\s+(.+)$/i.exec(authorization.trim());
  const raw = match?.[1]?.trim();
  if (!raw || raw.length < 16) return null;

  const user = findUserByMcpTokenHash(sha256(raw));
  if (!user) return null;

  // Re-read so a revoked credential can never resolve through a stale row.
  return findUserById(user.id);
}
