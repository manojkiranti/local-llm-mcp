import type { FastMCP } from 'fastmcp';
import type { ServiceSession } from '../auth/service-token.js';
import { registerBasicTools } from './basic/index.js';
import { registerEmsTools } from './ems/index.js';
import { registerHrmsTools } from './hrms/index.js';
import { registerIzoneTools } from './izone/index.js';

export function registerTools(server: FastMCP<ServiceSession>): void {
  registerBasicTools(server);
  registerHrmsTools(server);
  registerIzoneTools(server);
  registerEmsTools(server);
}
