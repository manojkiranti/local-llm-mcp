import type { FastMCP } from 'fastmcp';
import { z } from 'zod';
import type { ServiceSession } from '../../auth/service-token.js';

const EXAMPLES = [
  { id: 'time', tool: 'get_server_time', summary: 'Read the server clock in ISO 8601 format.' },
  { id: 'echo', tool: 'get_echo', summary: 'Return a supplied message from the MCP server.' },
  { id: 'hrms', tool: 'list_hrms_employees', summary: 'List sample HRMS employees.' },
];

export function registerListExamples(server: FastMCP<ServiceSession>): void {
  server.addTool({
    name: 'list_examples',
    description: 'List a few example read-only MCP tool calls available from this server.',
    parameters: z.object({
      limit: z.number().int().min(1).max(EXAMPLES.length).default(EXAMPLES.length)
        .describe(`Maximum number of examples to return, from 1 to ${EXAMPLES.length}.`),
    }),
    execute: async ({ limit }) => JSON.stringify(EXAMPLES.slice(0, limit), null, 2),
  });
}
