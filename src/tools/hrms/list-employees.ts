import type { FastMCP } from 'fastmcp';
import { z } from 'zod';
import type { ServiceSession } from '../../auth/service-token.js';
import { listSampleEmployees } from './sample-data.js';
import { EMPLOYMENT_STATUSES } from './types.js';

export function registerListHrmsEmployees(server: FastMCP<ServiceSession>): void {
  server.addTool({
    name: 'list_hrms_employees',
    description:
      'List sample HRMS employees. This currently returns mock data and will later use the real HRMS API.',
    parameters: z.object({
      department: z.string().min(1).max(100).optional()
        .describe('Optional department name to match, such as Engineering or Sales.'),
      employment_status: z.enum(EMPLOYMENT_STATUSES).optional()
        .describe('Optional employment status to include: active, on_leave, or inactive.'),
      limit: z.number().int().min(1).max(50).default(20)
        .describe('Maximum number of employees to return, from 1 to 50.'),
    }),
    execute: async ({ department, employment_status, limit }) => {
      const employees = listSampleEmployees({
        department,
        employmentStatus: employment_status,
        limit,
      });
      return JSON.stringify({ source: 'sample', count: employees.length, employees }, null, 2);
    },
  });
}
