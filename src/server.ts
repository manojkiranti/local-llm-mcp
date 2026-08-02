import { FastMCP } from 'fastmcp';
import { createAuthenticate, type ServiceSession } from './auth/service-token.js';
import { registerTools } from './tools/index.js';

export function createServer(serviceToken: string) {
  const server = new FastMCP<ServiceSession>({
    name: 'local-llm-tools',
    version: '1.0.0',
    authenticate: createAuthenticate(serviceToken),
  });
  registerTools(server);
  return server;
}
