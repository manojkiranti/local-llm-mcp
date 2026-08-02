import type { FastMCP } from 'fastmcp';
import { z } from 'zod';
import type { ServiceSession } from '../../auth/service-token.js';

export function registerGetEcho(server: FastMCP<ServiceSession>): void {
  server.addTool({
    name: 'get_echo',
    description: 'Return the supplied message unchanged to verify MCP arguments and tool results.',
    parameters: z.object({
      message: z.string().min(1).max(1_000)
        .describe('Text for the MCP server to return unchanged.'),
    }),
    execute: async ({ message }) => message,
  });
}
