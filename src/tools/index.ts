import type { FastMCP } from 'fastmcp';
import type { ServiceSession } from '../auth/service-token.js';
import { registerBasicTools } from './basic/index.js';
import { registerHrmsTools } from './hrms/index.js';

export function registerTools(server: FastMCP<ServiceSession>): void {
  registerBasicTools(server);
  registerHrmsTools(server);
}
