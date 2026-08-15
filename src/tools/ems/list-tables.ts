import type { FastMCP } from 'fastmcp';
import { z } from 'zod';
import type { ServiceSession } from '../../auth/service-token.js';
import { fetchEmsTableColumns, fetchEmsTables, isEmsConfigured } from '../../integrations/ems/client.js';
import { SAMPLE_TABLES, sampleTableColumns } from './sample-data.js';

export function registerListEmsTables(server: FastMCP<ServiceSession>): void {
  server.addTool({
    name: 'list_ems_tables',
    description:
      'List tables in the EMS (Expenses Management System) MySQL database (name, approximate row ' +
      'count, comment), or pass table to get that table\'s columns (name, type, nullable, key, ' +
      'default, comment). Call this before search_ems_records to learn the real table/column names — ' +
      'do not guess them. Uses the live database when EMS_DB_HOST/EMS_DB_NAME/EMS_DB_USER are ' +
      'configured, otherwise returns a mock expenses schema.',
    parameters: z.object({
      table: z.string().min(1).max(128).optional()
        .describe('Optional exact table name to get its column details instead of the full table list.'),
    }),
    execute: async ({ table }) => {
      if (isEmsConfigured()) {
        try {
          if (table) {
            const value = await fetchEmsTableColumns(table);
            return JSON.stringify({ source: 'ems', table, count: value.length, value }, null, 2);
          }
          const value = await fetchEmsTables();
          return JSON.stringify({ source: 'ems', count: value.length, value }, null, 2);
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown EMS error.';
          return JSON.stringify({ source: 'ems', table, error: message, count: 0, value: [] }, null, 2);
        }
      }

      if (table) {
        const value = sampleTableColumns(table);
        return JSON.stringify({ source: 'sample', table, count: value.length, value }, null, 2);
      }
      return JSON.stringify(
        { source: 'sample', count: SAMPLE_TABLES.length, value: SAMPLE_TABLES },
        null,
        2,
      );
    },
  });
}
