import type { FastMCP } from 'fastmcp';
import { z } from 'zod';
import type { ServiceSession } from '../../auth/service-token.js';
import { isHrmsConfigured } from '../../integrations/hrms/client.js';
import { toSummary } from './project.js';
import { fetchEmployeePage, paginateSample } from './query.js';
import { listSampleEmployees } from './sample-data.js';
import type { EmployeeFilters } from './types.js';

export function registerListHrmsEmployees(server: FastMCP<ServiceSession>): void {
  server.addTool({
    name: 'list_hrms_employees',
    description:
      'List active HRMS employees, with a compact field summary and a page of results at a time to ' +
      'stay within response size limits — check hasMore/nextOffset and call again with ' +
      'offset=nextOffset for more rather than raising limit. Use get_hrms_employee_details instead ' +
      'for a specific employee or full field detail. Uses the live HRMS active-employee feed when ' +
      'HRMS_BASE_URL is configured, otherwise returns mock data.',
    parameters: z.object({
      department: z.string().min(1).max(100).optional()
        .describe('Optional department name to match, such as Engineering or Sales.'),
      province: z.string().min(1).max(100).optional()
        .describe('Optional province name to match, such as Bagmati or Koshi.'),
      branch: z.string().min(1).max(100).optional()
        .describe('Optional branch name to match, such as Head Office.'),
      limit: z.number().int().min(1).max(25).default(10)
        .describe('Employees to return per page, from 1 to 25. Page through with offset for more.'),
      offset: z.number().int().min(0).max(10_000).default(0)
        .describe('Matching employees to skip before this page. Pass nextOffset from the previous call.'),
    }),
    execute: async ({ department, province, branch, limit, offset }) => {
      const filters: EmployeeFilters = { department, province, branch, limit, offset };

      if (isHrmsConfigured()) {
        try {
          const { page, hasMore } = await fetchEmployeePage(filters);
          const value = page.map(toSummary);
          return JSON.stringify(
            {
              source: 'hrms',
              count: value.length,
              offset,
              limit,
              hasMore,
              nextOffset: hasMore ? offset + limit : null,
              value,
            },
            null,
            2,
          );
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown HRMS error.';
          return JSON.stringify({ source: 'hrms', error: message, count: 0, value: [] }, null, 2);
        }
      }

      const matched = listSampleEmployees({ ...filters, limit: limit + 1 });
      const { page, hasMore } = paginateSample(matched, limit);
      const value = page.map(toSummary);
      return JSON.stringify(
        {
          source: 'sample',
          count: value.length,
          offset,
          limit,
          hasMore,
          nextOffset: hasMore ? offset + limit : null,
          value,
        },
        null,
        2,
      );
    },
  });
}
