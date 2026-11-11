import { randomBytes, randomUUID } from 'node:crypto';

export const newId = (): string => randomUUID();

export const newToken = (bytes: number): string => randomBytes(bytes).toString('base64url');
