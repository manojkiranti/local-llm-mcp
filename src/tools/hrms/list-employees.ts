import type { FastMCP } from 'fastmcp';
import { z } from 'zod';
import type { ServiceSession } from '../../auth/service-token.js';
import { fetchActiveEmployees, isHrmsConfigured } from '../../integrations/hrms/client.js';
import { filterEmployees } from './filter.js';
import { listSampleEmployees } from './sample-data.js';

export function registerListHrmsEmployees(server: FastMCP<ServiceSession>): void {
  server.addTool({
    name: 'list_hrms_employees',
    description:
      'List active HRMS employees. Uses the live HRMS active-employee feed when HRMS_BASE_URL is configured, otherwise returns mock data shaped like that feed.',
    parameters: z.object({
      department: z.string().min(1).max(100).optional()
        .describe('Optional department name to match, such as Engineering or Sales.'),
      province: z.string().min(1).max(100).optional()
        .describe('Optional province name to match, such as Bagmati or Koshi.'),
      branch: z.string().min(1).max(100).optional()
        .describe('Optional branch name to match, such as Head Office.'),
      limit: z.number().int().min(1).max(50).default(20)
        .describe('Maximum number of employees to return, from 1 to 50.'),
    }),
    execute: async ({ department, province, branch, limit }) => {
      const filters = { department, province, branch, limit };

      if (isHrmsConfigured()) {
        try {
          const employees = filterEmployees(await fetchActiveEmployees(), filters);
          return JSON.stringify({ source: 'hrms', count: employees.length, value: employees }, null, 2);
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown HRMS error.';
          return JSON.stringify({ source: 'hrms', error: message, count: 0, value: [] }, null, 2);
        }
      }

      const employees = listSampleEmployees(filters);
      return JSON.stringify({ source: 'sample', count: employees.length, value: employees }, null, 2);
    },
  });
}
