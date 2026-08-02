import type { FastMCP } from 'fastmcp';
import type { ServiceSession } from '../../auth/service-token.js';
import { registerListHrmsEmployees } from './list-employees.js';

export function registerHrmsTools(server: FastMCP<ServiceSession>): void {
  registerListHrmsEmployees(server);
}
