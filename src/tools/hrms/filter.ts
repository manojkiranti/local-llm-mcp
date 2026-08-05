import type { Employee, EmployeeFilters } from './types.js';

// Applies the tool's filters in memory. Used for both the sample data and the
// live HRMS feed, so the two paths behave identically.
export function filterEmployees(
  employees: readonly Employee[],
  filters: EmployeeFilters,
): Employee[] {
  const department = filters.department?.trim().toLowerCase();
  const province = filters.province?.trim().toLowerCase();
  const branch = filters.branch?.trim().toLowerCase();
  return employees
    .filter((employee) => !department || employee.Department_Name.toLowerCase() === department)
    .filter((employee) => !province || employee.Province_Name.toLowerCase() === province)
    .filter((employee) => !branch || employee.Branch_Name.toLowerCase() === branch)
    .slice(0, filters.limit);
}
