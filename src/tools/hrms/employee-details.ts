import type { FastMCP } from 'fastmcp';
import { z } from 'zod';
import type { ServiceSession } from '../../auth/service-token.js';
import { isHrmsConfigured } from '../../integrations/hrms/client.js';
import { toSummary } from './project.js';
import { fetchEmployeePage, paginateSample } from './query.js';
import { listSampleEmployees } from './sample-data.js';
import type { EmployeeFilters } from './types.js';

export function registerGetHrmsEmployeeDetails(server: FastMCP<ServiceSession>): void {
  server.addTool({
    name: 'get_hrms_employee_details',
    description:
      'Look up or list employee details from the HRMS active-employee feed — by employee number, ' +
      'name, department, province, or branch, with a free-text search across name, email, ' +
      'department, branch, title, and employee number. Use this to answer chat questions like "show ' +
      'me employee EMP-1001", "list employees in Engineering", or "find employees named Sharma". ' +
      'Returns a compact field summary and a page of results at a time to stay within response size ' +
      'limits — check hasMore/nextOffset in the response and call again with offset=nextOffset to ' +
      'fetch the rest rather than raising limit. Set full=true (or pass employeeNo) to get every HRMS ' +
      'field for a specific employee. Uses the live HRMS feed when HRMS_BASE_URL is configured, ' +
      'otherwise returns mock data.',
    parameters: z.object({
      employeeNo: z.string().min(1).max(50).optional()
        .describe('Exact employee number to look up, such as EMP-1001. Implies full=true.'),
      fullName: z.string().min(1).max(100).optional()
        .describe('Full or partial employee name to match, such as Sharma.'),
      department: z.string().min(1).max(100).optional()
        .describe('Department name to match, such as Engineering or Sales.'),
      province: z.string().min(1).max(100).optional()
        .describe('Province name to match, such as Bagmati or Koshi.'),
      branch: z.string().min(1).max(100).optional()
        .describe('Branch name to match, such as Head Office.'),
      search: z.string().min(1).max(100).optional()
        .describe(
          'Free-text search across name, email, department, branch, title, and employee number. ' +
            'Use this when the other fields do not clearly apply.',
        ),
      full: z.boolean().optional().default(false)
        .describe(
          'Return every HRMS field for each employee instead of the compact summary. Automatically ' +
            'enabled when employeeNo is set. Only use for a small number of results.',
        ),
      limit: z.number().int().min(1).max(25).default(10)
        .describe('Employees to return per page, from 1 to 25. Page through with offset for more.'),
      offset: z.number().int().min(0).max(10_000).default(0)
        .describe('Matching employees to skip before this page. Pass nextOffset from the previous call.'),
    }),
    execute: async ({
      employeeNo,
      fullName,
      department,
      province,
      branch,
      search,
      full,
      limit,
      offset,
    }) => {
      const wantsFull = full || Boolean(employeeNo);
      const filters: EmployeeFilters = {
        employeeNo,
        fullName,
        department,
        province,
        branch,
        search,
        limit,
        offset,
      };

      if (isHrmsConfigured()) {
        try {
          const { page, hasMore } = await fetchEmployeePage(filters);
          const value = wantsFull ? page : page.map(toSummary);
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
      const value = wantsFull ? page : page.map(toSummary);
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
