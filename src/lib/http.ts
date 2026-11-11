import type { z } from 'zod';
import { AppError } from './errors.js';
import { fieldErrors } from './validation.js';

export function parse<T>(schema: z.ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const fields = fieldErrors(result.error);
    const first = Object.values(fields)[0] ?? 'Check the form and try again.';
    throw new AppError(422, 'invalid_input', first, fields);
  }
  return result.data;
}
