import type { FastMCP } from 'fastmcp';
import type { ServiceSession } from '../../auth/service-token.js';
import { registerGetEcho } from './get-echo.js';
import { registerGetServerTime } from './get-server-time.js';
import { registerListExamples } from './list-examples.js';

export function registerBasicTools(server: FastMCP<ServiceSession>): void {
  registerGetServerTime(server);
  registerGetEcho(server);
  registerListExamples(server);
}
