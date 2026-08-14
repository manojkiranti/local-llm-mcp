import type { FastMCP } from 'fastmcp';
import type { ServiceSession } from '../../auth/service-token.js';
import { registerListEmsTables } from './list-tables.js';
import { registerSearchEmsRecords } from './search-records.js';

export function registerEmsTools(server: FastMCP<ServiceSession>): void {
  registerListEmsTables(server);
  registerSearchEmsRecords(server);
}
