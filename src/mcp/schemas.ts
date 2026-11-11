import { z } from 'zod';
import { dateSchema, statusSchema, titleSchema } from '../lib/validation.js';

/**
 * One schema per tool, shared by the MCP registration and the pre-flight
 * validator. The validator exists because the SDK turns every thrown error,
 * including InvalidParams, into an isError tool result. The specification puts
 * invalid arguments in the protocol error channel, so we check them before the
 * SDK handler runs.
 */

const createProject = z.object({
  title: titleSchema.describe('Project name, usually the client and the engagement.'),
  description: z
    .string()
    .trim()
    .max(2000)
    .default('')
    .describe('Internal summary. Never shown to the client.'),
});

const createItem = z.object({
  project_id: z.string().min(1).describe('The project to add the deliverable to.'),
  title: titleSchema.describe('What is being delivered.'),
  status: statusSchema
    .default('not_started')
    .describe('One of not_started, in_progress, blocked, done.'),
  due_date: dateSchema.optional().describe('Due date in YYYY-MM-DD form. Omit when there is no date.'),
});

const updateItem = z.object({
  id: z.string().min(1).describe('The deliverable id.'),
  title: titleSchema.optional().describe('New title.'),
  status: statusSchema.optional().describe('New status.'),
  due_date: dateSchema
    .nullable()
    .optional()
    .describe('New due date in YYYY-MM-DD form, or null to clear it.'),
});

const getProject = z.object({
  id: z.string().min(1).describe('The project id.'),
});

const listProjects = z.object({});

export const toolInputShapes = {
  create_project: createProject.shape,
  create_item: createItem.shape,
  update_item: updateItem.shape,
  get_project: getProject.shape,
  list_projects: listProjects.shape,
} as const;

export const toolValidators = {
  create_project: createProject,
  create_item: createItem,
  update_item: updateItem.refine(
    (value) => value.title !== undefined || value.status !== undefined || value.due_date !== undefined,
    { message: 'Send at least one of title, status or due_date.' },
  ),
  get_project: getProject,
  list_projects: listProjects,
} as const;

export type ToolName = keyof typeof toolValidators;
