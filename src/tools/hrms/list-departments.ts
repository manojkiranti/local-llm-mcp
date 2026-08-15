import type { FastMCP } from 'fastmcp';
import { z } from 'zod';
import type { ServiceSession } from '../../auth/service-token.js';
import { isHrmsConfigured } from '../../integrations/hrms/client.js';
import { fetchDepartmentPage, paginateSample } from './query.js';
import { listSampleDepartments } from './sample-data.js';
import type { DepartmentFilters } from './types.js';

export function registerListHrmsDepartments(server: FastMCP<ServiceSession>): void {
  server.addTool({
    name: 'list_hrms_departments',
    description:
      'List HRMS departments, with a page of results at a time to stay within response size limits ' +
      '— check hasMore/nextOffset and call again with offset=nextOffset for more rather than raising ' +
      'limit. Blocked (disabled) departments are excluded by default; set includeBlocked=true to see ' +
      'them too. Use this to answer chat questions like "what departments are there" or "find the ' +
      'department code for Sales". Uses the live HRMS departments feed when HRMS_BASE_URL is ' +
      'configured, otherwise returns mock data.',
    parameters: z.object({
      name: z.string().min(1).max(100).optional()
        .describe('Optional department name to match (substring, case-insensitive), such as Sales.'),
      code: z.string().min(1).max(50).optional()
        .describe('Optional exact department code to match, such as DEPT001.'),
      includeBlocked: z.boolean().optional().default(false)
        .describe('Include blocked (disabled) departments. Defaults to false.'),
      limit: z.number().int().min(1).max(50).default(20)
        .describe('Departments to return per page, from 1 to 50. Page through with offset for more.'),
      offset: z.number().int().min(0).max(10_000).default(0)
        .describe('Matching departments to skip before this page. Pass nextOffset from the previous call.'),
    }),
    execute: async ({ name, code, includeBlocked, limit, offset }) => {
      const filters: DepartmentFilters = { name, code, includeBlocked, limit, offset };

      if (isHrmsConfigured()) {
        try {
          const { page, hasMore } = await fetchDepartmentPage(filters);
          return JSON.stringify(
            {
              source: 'hrms',
              count: page.length,
              offset,
              limit,
              hasMore,
              nextOffset: hasMore ? offset + limit : null,
              value: page,
            },
            null,
            2,
          );
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown HRMS error.';
          return JSON.stringify({ source: 'hrms', error: message, count: 0, value: [] }, null, 2);
        }
      }

      const matched = listSampleDepartments({ ...filters, limit: limit + 1 });
      const { page, hasMore } = paginateSample(matched, limit);
      return JSON.stringify(
        {
          source: 'sample',
          count: page.length,
          offset,
          limit,
          hasMore,
          nextOffset: hasMore ? offset + limit : null,
          value: page,
        },
        null,
        2,
      );
    },
  });
}
