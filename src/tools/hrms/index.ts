import type { FastMCP } from 'fastmcp';
import type { ServiceSession } from '../../auth/service-token.js';
import { registerGetHrmsEmployeeDetails } from './employee-details.js';
import { registerGetHrmsEmployeeTasks } from './employee-tasks.js';
import { registerListHrmsDepartments } from './list-departments.js';
import { registerListHrmsEmployees } from './list-employees.js';

export function registerHrmsTools(server: FastMCP<ServiceSession>): void {
  registerListHrmsEmployees(server);
  registerGetHrmsEmployeeDetails(server);
  registerGetHrmsEmployeeTasks(server);
  registerListHrmsDepartments(server);
}
