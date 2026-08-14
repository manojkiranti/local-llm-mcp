import type { FastMCP } from 'fastmcp';
import { z } from 'zod';
import type { ServiceSession } from '../../auth/service-token.js';
import { fetchIzoneFolderContents, isIzoneConfigured } from '../../integrations/izone/client.js';
import { filterFolderEntries, paginate } from './filter.js';
import { listSampleFolderEntries } from './sample-data.js';
import type { IzoneFolderEntry, IzoneFolderFilters } from './types.js';

export function registerListIzoneDocuments(server: FastMCP<ServiceSession>): void {
  server.addTool({
    name: 'list_izone_documents',
    description:
      'List the folders and files directly inside a document library folder on the iZone site (not ' +
      "recursive — call again with a subfolder's ServerRelativeUrl to go deeper). Defaults to the " +
      '"Shared Documents" library root. Supports name search and limit/offset paging. Use ' +
      'list_izone_lists first to find document library titles. Uses the live iZone site when ' +
      'IZONE_BASE_URL is configured, otherwise returns mock data.',
    parameters: z.object({
      folder: z.string().min(1).max(400).default('/Shared Documents')
        .describe(
          'Server-relative folder path to list, such as "/Shared Documents" or ' +
            '"/Shared Documents/Policies". Defaults to the Shared Documents library root.',
        ),
      search: z.string().min(1).max(100).optional()
        .describe('Optional substring to match against folder/file names.'),
      limit: z.number().int().min(1).max(100).default(25)
        .describe('Entries to return per page, from 1 to 100. Page through with offset for more.'),
      offset: z.number().int().min(0).max(10_000).default(0)
        .describe('Matching entries to skip before this page. Pass nextOffset from the previous call.'),
    }),
    execute: async ({ folder, search, limit, offset }) => {
      const filters: IzoneFolderFilters = { search, limit, offset };

      if (isIzoneConfigured()) {
        try {
          const { files, folders } = await fetchIzoneFolderContents(folder);
          const entries: IzoneFolderEntry[] = [
            ...folders.map((f) => ({ entryType: 'folder' as const, ...f })),
            ...files.map((f) => ({ entryType: 'file' as const, ...f })),
          ];
          const matched = filterFolderEntries(entries, { ...filters, limit: limit + 1 });
          const { page, hasMore } = paginate(matched, limit);
          return JSON.stringify(
            {
              source: 'izone',
              folder,
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
          const message = error instanceof Error ? error.message : 'Unknown iZone error.';
          return JSON.stringify({ source: 'izone', folder, error: message, count: 0, value: [] }, null, 2);
        }
      }

      const matched = listSampleFolderEntries({ ...filters, limit: limit + 1 });
      const { page, hasMore } = paginate(matched, limit);
      return JSON.stringify(
        {
          source: 'sample',
          folder,
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
