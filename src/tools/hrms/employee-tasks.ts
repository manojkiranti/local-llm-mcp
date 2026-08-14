import type { FastMCP } from 'fastmcp';
import { z } from 'zod';
import type { ServiceSession } from '../../auth/service-token.js';
import { fetchEmployeeTasks, isHrmsConfigured } from '../../integrations/hrms/client.js';
import { sampleEmployeeTasks } from './sample-data.js';

export function registerGetHrmsEmployeeTasks(server: FastMCP<ServiceSession>): void {
  server.addTool({
    name: 'get_hrms_employee_tasks',
    description:
      'Get pending task/approval counts for one HRMS employee (attendance, leave, travel, transfer, ' +
      'overtime, resignation, loan, and allowance recommendations/approvals awaiting them), by ' +
      'employee number. Use this to answer chat questions like "what does EMP-1001 have pending" or ' +
      '"how many leave requests does AA1228 need to approve". Uses the live HRMS tasks feed when ' +
      'HRMS_BASE_URL is configured, otherwise returns mock data.',
    parameters: z.object({
      employeeId: z.string().min(1).max(50)
        .describe('Employee number to look up pending tasks for, such as EMP-1001 or AA1228.'),
    }),
    execute: async ({ employeeId }) => {
      if (isHrmsConfigured()) {
        try {
          const value = await fetchEmployeeTasks(employeeId);
          return JSON.stringify({ source: 'hrms', employeeId, value }, null, 2);
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown HRMS error.';
          return JSON.stringify({ source: 'hrms', employeeId, error: message, value: [] }, null, 2);
        }
      }

      return JSON.stringify(
        { source: 'sample', employeeId, value: [sampleEmployeeTasks(employeeId)] },
        null,
        2,
      );
    },
  });
}
