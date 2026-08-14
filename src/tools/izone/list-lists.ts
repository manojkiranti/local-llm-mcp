import type { FastMCP } from 'fastmcp';
import { z } from 'zod';
import type { ServiceSession } from '../../auth/service-token.js';
import { fetchIzoneLists, isIzoneConfigured } from '../../integrations/izone/client.js';
import { filterLists, paginate } from './filter.js';
import { listSampleLists } from './sample-data.js';
import type { IzoneListFilters } from './types.js';

// Safety cap on how many lists to pull from the server before filtering/
// paginating in memory — the lists collection doesn't page server-side, but
// a SharePoint site realistically has well under this many lists/libraries.
const LISTS_FETCH_CAP = 1000;

export function registerListIzoneLists(server: FastMCP<ServiceSession>): void {
  server.addTool({
    name: 'list_izone_lists',
    description:
      'List SharePoint lists and document libraries on the iZone site (title, item count, and ' +
      'whether it is a document library), with optional title search and limit/offset paging. Use ' +
      'this first to find the exact list/library title to pass to list_izone_list_items or ' +
      'list_izone_documents — titles are case-sensitive and must match exactly. Uses the live iZone ' +
      'site when IZONE_BASE_URL is configured, otherwise returns mock data.',
    parameters: z.object({
      search: z.string().min(1).max(100).optional()
        .describe('Optional substring to match against list/library titles, such as Policy or Leave.'),
      limit: z.number().int().min(1).max(50).default(20)
        .describe('Lists to return per page, from 1 to 50. Page through with offset for more.'),
      offset: z.number().int().min(0).max(10_000).default(0)
        .describe('Matching lists to skip before this page. Pass nextOffset from the previous call.'),
    }),
    execute: async ({ search, limit, offset }) => {
      const filters: IzoneListFilters = { search, limit, offset };

      if (isIzoneConfigured()) {
        try {
          const { results } = await fetchIzoneLists(LISTS_FETCH_CAP);
          const matched = filterLists(results, { ...filters, limit: limit + 1 });
          const { page, hasMore } = paginate(matched, limit);
          const value = page.map((list) => ({ ...list, IsDocumentLibrary: list.BaseTemplate === 101 }));
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

      const matched = listSampleLists({ ...filters, limit: limit + 1 });
      const { page, hasMore } = paginate(matched, limit);
      const value = page.map((list) => ({ ...list, IsDocumentLibrary: list.BaseTemplate === 101 }));
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
