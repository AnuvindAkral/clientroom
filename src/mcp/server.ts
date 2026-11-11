import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { User } from '../types.js';
import { createProject, getProjectWithItems, listProjects } from '../services/projects.js';
import { createItem, updateItem } from '../services/items.js';
import { toolInputShapes } from './schemas.js';

const NOT_FOUND_PROJECT = 'Project not found or unauthorized.';
const NOT_FOUND_ITEM = 'Deliverable not found or unauthorized.';

function json(value: unknown) {
  return {
    content: [{ type: 'text' as const, text: JSON.stringify(value, null, 2) }],
  };
}

function describeProject(project: {
  id: string;
  title: string;
  description: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}) {
  return {
    id: project.id,
    title: project.title,
    description: project.description,
    status: project.status,
    created_at: project.createdAt,
    updated_at: project.updatedAt,
  };
}

function describeItem(item: {
  id: string;
  projectId: string;
  title: string;
  status: string;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
}) {
  return {
    id: item.id,
    project_id: item.projectId,
    title: item.title,
    status: item.status,
    due_date: item.dueDate,
    created_at: item.createdAt,
    updated_at: item.updatedAt,
  };
}

/**
 * The server is created per request and bound to the authenticated user. No
 * tool can read or write outside that user's data, because the user id never
 * comes from the request body.
 */
export function createMcpServerForUser(user: User): McpServer {
  const server = new McpServer(
    { name: 'clientroom', version: '1.0.0' },
    {
      instructions:
        'Clientroom holds client delivery projects. Use create_project to start a project, create_item to add a deliverable, update_item to change one, get_project to read a project with its deliverables, and list_projects to see everything. Statuses are not_started, in_progress, blocked or done. Dates are YYYY-MM-DD.',
    },
  );

  server.registerTool(
    'create_project',
    {
      title: 'Create project',
      description:
        'Create a client delivery project for the signed-in studio. Returns the new project with its id.',
      inputSchema: toolInputShapes.create_project,
    },
    async ({ title, description }) => {
      const project = createProject(user.id, title, description);
      return json({ project: describeProject(project) });
    },
  );

  server.registerTool(
    'create_item',
    {
      title: 'Add deliverable',
      description:
        'Add a deliverable to an existing project. Use the project id returned by create_project or list_projects.',
      inputSchema: toolInputShapes.create_item,
    },
    async ({ project_id, title, status, due_date }) => {
      const item = createItem(user.id, project_id, {
        title,
        status,
        dueDate: due_date ?? null,
      });
      if (!item) throw new Error(NOT_FOUND_PROJECT);
      return json({ item: describeItem(item) });
    },
  );

  server.registerTool(
    'update_item',
    {
      title: 'Update deliverable',
      description:
        'Change a deliverable title, status or due date. Send only the fields that change.',
      inputSchema: toolInputShapes.update_item,
    },
    async ({ id, title, status, due_date }) => {
      if (title === undefined && status === undefined && due_date === undefined) {
        throw new Error('Nothing to update. Send at least one of title, status or due_date.');
      }
      const item = updateItem(user.id, id, {
        title,
        status,
        dueDate: due_date === undefined ? undefined : due_date,
      });
      if (!item) throw new Error(NOT_FOUND_ITEM);
      return json({ item: describeItem(item) });
    },
  );

  server.registerTool(
    'get_project',
    {
      title: 'Get project',
      description: 'Read one project and all of its deliverables.',
      inputSchema: toolInputShapes.get_project,
    },
    async ({ id }) => {
      const result = getProjectWithItems(user.id, id);
      if (!result) throw new Error(NOT_FOUND_PROJECT);
      return json({
        project: describeProject(result.project),
        items: result.items.map(describeItem),
      });
    },
  );

  server.registerTool(
    'list_projects',
    {
      title: 'List projects',
      description: 'List every project for the signed-in studio, most recently updated first.',
      inputSchema: toolInputShapes.list_projects,
    },
    async () => {
      const projects = listProjects(user.id).map((project) => ({
        ...describeProject(project),
        item_count: project.totalItems,
        done_count: project.doneItems,
      }));
      return json({ projects });
    },
  );

  return server;
}
