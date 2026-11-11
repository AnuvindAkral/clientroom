import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { config } from '../config.js';
import { newToken } from './ids.js';

export function sha256(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

/**
 * Share tokens must be shown again to their owner, but they should not sit in
 * the database as plaintext. They are stored encrypted with a key derived from
 * the session secret, and looked up by hash so decryption is never needed to
 * resolve a link.
 */
const shareKey = createHash('sha256').update(`${config.sessionSecret}|share-token`).digest();

export function encryptShareToken(raw: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', shareKey, iv);
  const ciphertext = Buffer.concat([cipher.update(raw, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString('base64url'), tag.toString('base64url'), ciphertext.toString('base64url')].join('.');
}

export function decryptShareToken(stored: string): string | null {
  try {
    const [ivPart, tagPart, dataPart] = stored.split('.');
    if (!ivPart || !tagPart || !dataPart) return null;
    const decipher = createDecipheriv('aes-256-gcm', shareKey, Buffer.from(ivPart, 'base64url'));
    decipher.setAuthTag(Buffer.from(tagPart, 'base64url'));
    return Buffer.concat([
      decipher.update(Buffer.from(dataPart, 'base64url')),
      decipher.final(),
    ]).toString('utf8');
  } catch {
    return null;
  }
}

/** MCP credentials are high entropy, so a fast hash is appropriate at rest. */
export function generateMcpToken(): { raw: string; hash: string; prefix: string } {
  const raw = `crm_${newToken(32)}`;
  return { raw, hash: sha256(raw), prefix: raw.slice(0, 12) };
}

/** Share tokens are bearer capabilities. Only the hash is stored. */
export function generateShareToken(): { raw: string; hash: string } {
  const raw = newToken(24);
  return { raw, hash: sha256(raw) };
}

export function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

function sign(payload: string): string {
  return createHmac('sha256', config.sessionSecret).update(payload).digest('base64url');
}

export function createSessionToken(userId: string, now = Date.now()): string {
  const payload = Buffer.from(
    JSON.stringify({ uid: userId, exp: now + config.sessionTtlSeconds * 1000 }),
    'utf8',
  ).toString('base64url');
  return `${payload}.${sign(payload)}`;
}

export function readSessionToken(token: string | undefined, now = Date.now()): string | null {
  if (!token) return null;
  const dot = token.lastIndexOf('.');
  if (dot <= 0) return null;

  const payload = token.slice(0, dot);
  const signature = token.slice(dot + 1);
  if (!safeEqual(signature, sign(payload))) return null;

  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as {
      uid?: unknown;
      exp?: unknown;
    };
    if (typeof parsed.uid !== 'string' || typeof parsed.exp !== 'number') return null;
    if (parsed.exp <= now) return null;
    return parsed.uid;
  } catch {
    return null;
  }
}
