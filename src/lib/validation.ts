import { z } from 'zod';
import { STATUSES, normalizeStatus, type Status } from './status.js';
import { isDateOnly } from './time.js';

export const emailSchema = z
  .string()
  .trim()
  .min(3, 'Enter an email address.')
  .max(254, 'That email is too long.')
  .email('Enter a valid email address.')
  .transform((value) => value.toLowerCase());

export const passwordSchema = z
  .string()
  .min(8, 'Use at least 8 characters.')
  .max(200, 'Use 200 characters or fewer.');

export const titleSchema = z
  .string()
  .trim()
  .min(1, 'Give it a name.')
  .max(200, 'Use 200 characters or fewer.');

export const descriptionSchema = z
  .string()
  .trim()
  .max(2000, 'Use 2000 characters or fewer.')
  .default('');

export const dateSchema = z
  .string()
  .trim()
  .refine((value) => isDateOnly(value), 'Use a date in YYYY-MM-DD form.');

/**
 * Status input from a human select or from a model. Normalised before it is
 * validated, so "Complete" and "in progress" both work.
 */
export const statusSchema = z
  .string()
  .trim()
  .transform((value, ctx) => {
    const normalised = normalizeStatus(value);
    if (!normalised) {
      ctx.addIssue({
        code: 'custom',
        message: `Use one of: ${STATUSES.join(', ')}.`,
      });
      return z.NEVER;
    }
    return normalised satisfies Status;
  });

export const signupSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Enter your password.'),
});

export const createProjectSchema = z.object({
  title: titleSchema,
  description: descriptionSchema.optional().default(''),
});

export const updateProjectSchema = z
  .object({
    title: titleSchema.optional(),
    description: descriptionSchema.optional(),
  })
  .refine((value) => value.title !== undefined || value.description !== undefined, {
    message: 'Nothing to update.',
  });

export const createItemSchema = z.object({
  project_id: z.string().min(1),
  title: titleSchema,
  status: statusSchema.optional().default('not_started'),
  due_date: dateSchema.nullish(),
});

export const updateItemSchema = z
  .object({
    title: titleSchema.optional(),
    status: statusSchema.optional(),
    due_date: dateSchema.nullish(),
  })
  .refine(
    (value) =>
      value.title !== undefined || value.status !== undefined || value.due_date !== undefined,
    { message: 'Nothing to update.' },
  );

export function fieldErrors(error: z.ZodError): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join('.') || 'form';
    if (!fields[key]) fields[key] = issue.message;
  }
  return fields;
}
