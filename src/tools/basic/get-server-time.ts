import type { FastMCP } from 'fastmcp';
import { z } from 'zod';
import type { ServiceSession } from '../../auth/service-token.js';

export function registerGetServerTime(server: FastMCP<ServiceSession>): void {
  server.addTool({
    name: 'get_server_time',
    description: 'Get the MCP server current UTC date and time in ISO 8601 format.',
    parameters: z.object({}),
    execute: async () => new Date().toISOString(),
  });
}
