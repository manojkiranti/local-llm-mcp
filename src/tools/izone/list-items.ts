import type { FastMCP } from 'fastmcp';
import { z } from 'zod';
import type { ServiceSession } from '../../auth/service-token.js';
import { fetchIzoneListItems, isIzoneConfigured } from '../../integrations/izone/client.js';
import { sampleListItems } from './sample-data.js';

export function registerListIzoneListItems(server: FastMCP<ServiceSession>): void {
  server.addTool({
    name: 'list_izone_list_items',
    description:
      'Get rows from a SharePoint list on the iZone site by exact title (case-sensitive — use ' +
      'list_izone_lists to find it). Supports an OData $select (field names) and $filter (e.g. ' +
      '"Status eq \'Active\'"), which this endpoint genuinely applies server-side. Paginated via an ' +
      'opaque cursor: check hasMore/nextCursor and pass nextCursor back as cursor for the next page — ' +
      'offset paging is not supported by this endpoint. Uses the live iZone site when IZONE_BASE_URL ' +
      'is configured, otherwise returns mock data.',
    parameters: z.object({
      listTitle: z.string().min(1).max(200)
        .describe('Exact, case-sensitive title of the list, such as Department or Announcements.'),
      select: z.array(z.string().min(1).max(100)).max(20).optional()
        .describe("Optional field (column) names to return. Omit to get the list's default fields."),
      filter: z.string().min(1).max(300).optional()
        .describe('Optional OData $filter expression, e.g. "Status eq \'Active\'".'),
      top: z.number().int().min(1).max(200).default(20)
        .describe('Rows to return in this page, from 1 to 200.'),
      cursor: z.string().min(1).optional()
        .describe(
          "Opaque paging cursor from a previous call's nextCursor. When set, listTitle/select/filter/" +
            'top are ignored — they are already baked into the cursor.',
        ),
    }),
    execute: async ({ listTitle, select, filter, top, cursor }) => {
      if (isIzoneConfigured()) {
        try {
          const { results, nextLink } = await fetchIzoneListItems(listTitle, {
            select,
            filter,
            top,
            cursor,
          });
          return JSON.stringify(
            {
              source: 'izone',
              listTitle,
              count: results.length,
              hasMore: Boolean(nextLink),
              nextCursor: nextLink ?? null,
              value: results,
            },
            null,
            2,
          );
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown iZone error.';
          return JSON.stringify(
            { source: 'izone', listTitle, error: message, count: 0, value: [] },
            null,
            2,
          );
        }
      }

      const { results, hasMore } = sampleListItems(top);
      return JSON.stringify(
        { source: 'sample', listTitle, count: results.length, hasMore, nextCursor: null, value: results },
        null,
        2,
      );
    },
  });
}
