import type { FastMCP } from 'fastmcp';
import { z } from 'zod';
import type { ServiceSession } from '../../auth/service-token.js';
import { isEmsConfigured, searchEmsRecords } from '../../integrations/ems/client.js';
import { sampleEmsRecords } from './sample-data.js';

export function registerSearchEmsRecords(server: FastMCP<ServiceSession>): void {
  server.addTool({
    name: 'search_ems_records',
    description:
      'Run a read-only SQL SELECT against the EMS (Expenses Management System) MySQL database and ' +
      'return the matching rows — use this to answer natural-language questions about expenses (e.g. ' +
      '"show pending expenses over 5000 for the Sales department") by translating them into SQL ' +
      'yourself. Call list_ems_tables first to learn real table/column names; do not guess them. Only ' +
      'a single SELECT statement is accepted — INSERT/UPDATE/DELETE, DDL, and multiple statements are ' +
      'rejected. If hasMore is true, narrow the SQL (add WHERE/ORDER BY) rather than just raising ' +
      'limit. Uses the live database when EMS_DB_HOST/EMS_DB_NAME/EMS_DB_USER are configured, ' +
      'otherwise returns a fixed sample of expense rows regardless of the sql given.',
    parameters: z.object({
      sql: z.string().min(1).max(4000)
        .describe(
          'A single read-only SELECT statement, e.g. "SELECT e.id, emp.full_name, e.amount, ' +
            'e.status FROM expenses e JOIN employees emp ON emp.id = e.employee_id WHERE e.status = ' +
            "'Pending' ORDER BY e.submitted_date DESC\". No semicolons, no non-SELECT statements.",
        ),
      limit: z.number().int().min(1).max(200).default(50)
        .describe('Maximum rows to return, from 1 to 200.'),
    }),
    execute: async ({ sql, limit }) => {
      if (isEmsConfigured()) {
        try {
          const { rows, hasMore } = await searchEmsRecords(sql, { limit });
          return JSON.stringify(
            { source: 'ems', count: rows.length, limit, hasMore, value: rows },
            null,
            2,
          );
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown EMS error.';
          return JSON.stringify({ source: 'ems', error: message, count: 0, value: [] }, null, 2);
        }
      }

      const value = sampleEmsRecords(limit);
      return JSON.stringify(
        {
          source: 'sample',
          count: value.length,
          limit,
          hasMore: false,
          note: 'EMS_DB_* is not configured; this is fixed sample data regardless of the sql given.',
          value,
        },
        null,
        2,
      );
    },
  });
}
