// Connects to the live MCP endpoint with the official SDK client, the same
// transport a real connector uses, and completes a short session.
//
//   node tools/mcp-client-check.mjs https://app.example.com/mcp <token>

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

const [, , url, token] = process.argv;

if (!url || !token) {
  console.error('Usage: node tools/mcp-client-check.mjs <mcp-url> <bearer-token>');
  process.exit(2);
}

const results = [];
function check(name, ok, detail = '') {
  results.push(ok);
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  ' + detail : ''}`);
}

const transport = new StreamableHTTPClientTransport(new URL(url), {
  requestInit: { headers: { authorization: `Bearer ${token}` } },
});

const client = new Client({ name: 'clientroom-production-check', version: '1.0.0' });

try {
  await client.connect(transport);
  check('SDK client connects over Streamable HTTP', true);

  const server = client.getServerVersion();
  check('server identifies itself', server?.name === 'clientroom', `${server?.name} ${server?.version}`);

  const tools = await client.listTools();
  const names = tools.tools.map((tool) => tool.name).sort();
  check('five tools are listed', names.length === 5, names.join(','));

  const created = await client.callTool({
    name: 'create_project',
    arguments: { title: 'Made by the official SDK client', description: 'Live check.' },
  });
  const project = JSON.parse(created.content[0].text).project;
  check('create_project returns a project', Boolean(project?.id));

  const item = await client.callTool({
    name: 'create_item',
    arguments: { project_id: project.id, title: 'Kickoff call', status: 'in progress', due_date: '2026-11-18' },
  });
  const createdItem = JSON.parse(item.content[0].text).item;
  check('create_item normalises the status', createdItem?.status === 'in_progress', createdItem?.status);

  const read = await client.callTool({ name: 'get_project', arguments: { id: project.id } });
  const readBody = JSON.parse(read.content[0].text);
  check('get_project reads the item back', readBody.items?.length === 1);

  const list = await client.callTool({ name: 'list_projects', arguments: {} });
  check('list_projects returns at least one project', JSON.parse(list.content[0].text).projects.length >= 1);

  const missing = await client.callTool({ name: 'get_project', arguments: { id: 'nope' } });
  check('a missing record is an isError result', missing.isError === true);

  await client.close();
} catch (error) {
  check('session completes without an exception', false, error instanceof Error ? error.message : String(error));
  process.exit(1);
}

const failed = results.filter((ok) => !ok).length;
console.log(`\n${results.length - failed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
