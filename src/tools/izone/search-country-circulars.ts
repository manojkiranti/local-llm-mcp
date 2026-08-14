import type { FastMCP } from 'fastmcp';
import { z } from 'zod';
import type { ServiceSession } from '../../auth/service-token.js';
import {
  buildCountryCircularViewUrl,
  fetchIzoneCountryCirculars,
  isIzoneCountryCircularConfigured,
} from '../../integrations/izone/circulars-client.js';
import { filterCountryCirculars, paginate } from './filter.js';
import { listSampleCountryCirculars } from './sample-data.js';
import type { IzoneCountryCircular, IzoneCountryCircularFilters } from './types.js';

function withViewUrl(circular: IzoneCountryCircular) {
  return { ...circular, viewUrl: buildCountryCircularViewUrl(circular) ?? null };
}

export function registerSearchIzoneCountryCirculars(server: FastMCP<ServiceSession>): void {
  server.addTool({
    name: 'search_izone_country_circulars',
    description:
      'Search the iZone Country Circular index (the data behind the "Search Country Circular" page) ' +
      'by free text, status, category, or originator, with limit/offset paging. Each result includes ' +
      'a viewUrl to open the document. Status is typically one of "Current Effective", "Effective", ' +
      '"Archived Effective", or "Obsolete". Uses the live iZone Country Circular feed when ' +
      'IZONE_COUNTRY_CIRCULAR_URL is configured, otherwise returns mock data.',
    parameters: z.object({
      search: z.string().min(1).max(100).optional()
        .describe('Free-text search across title, originator, category, status, description, and file name.'),
      status: z.string().min(1).max(50).optional()
        .describe('Exact circular status to match, such as "Current Effective" or "Obsolete".'),
      category: z.string().min(1).max(150).optional()
        .describe('Substring to match against the circular category.'),
      originator: z.string().min(1).max(100).optional()
        .describe('Substring to match against the originating department/team, such as "Human Resources".'),
      limit: z.number().int().min(1).max(50).default(10)
        .describe('Circulars to return per page, from 1 to 50. Page through with offset for more.'),
      offset: z.number().int().min(0).max(10_000).default(0)
        .describe('Matching circulars to skip before this page. Pass nextOffset from the previous call.'),
    }),
    execute: async ({ search, status, category, originator, limit, offset }) => {
      const filters: IzoneCountryCircularFilters = { search, status, category, originator, limit, offset };

      if (isIzoneCountryCircularConfigured()) {
        try {
          const circulars = await fetchIzoneCountryCirculars();
          const matched = filterCountryCirculars(circulars, { ...filters, limit: limit + 1 });
          const { page, hasMore } = paginate(matched, limit);
          const value = page.map(withViewUrl);
          return JSON.stringify(
            {
              source: 'izone',
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
          const message = error instanceof Error ? error.message : 'Unknown iZone error.';
          return JSON.stringify({ source: 'izone', error: message, count: 0, value: [] }, null, 2);
        }
      }

      const matched = listSampleCountryCirculars({ ...filters, limit: limit + 1 });
      const { page, hasMore } = paginate(matched, limit);
      const value = page.map(withViewUrl);
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
