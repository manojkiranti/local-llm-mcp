import type { Department, DepartmentFilters, Employee, EmployeeFilters } from './types.js';

// Applies the tool's filters in memory. Used for both the sample data and the
// live HRMS feed, so the two paths behave identically.
const SEARCH_FIELDS = [
  'No',
  'Full_Name',
  'Company_E_Mail',
  'Department_Name',
  'Branch_Name',
  'Functional_Title',
  'Mobile_Phone_No',
] as const satisfies readonly (keyof Employee)[];

export function filterEmployees(
  employees: readonly Employee[],
  filters: EmployeeFilters,
): Employee[] {
  const department = filters.department?.trim().toLowerCase();
  const province = filters.province?.trim().toLowerCase();
  const branch = filters.branch?.trim().toLowerCase();
  const employeeNo = filters.employeeNo?.trim().toLowerCase();
  const fullName = filters.fullName?.trim().toLowerCase();
  const search = filters.search?.trim().toLowerCase();
  return employees
    .filter((employee) => !department || employee.Department_Name.toLowerCase() === department)
    .filter((employee) => !province || employee.Province_Name.toLowerCase() === province)
    .filter((employee) => !branch || employee.Branch_Name.toLowerCase() === branch)
    .filter((employee) => !employeeNo || employee.No.toLowerCase() === employeeNo)
    .filter((employee) => !fullName || employee.Full_Name.toLowerCase().includes(fullName))
    .filter(
      (employee) =>
        !search ||
        SEARCH_FIELDS.some((field) => String(employee[field] ?? '').toLowerCase().includes(search)),
    )
    .slice(filters.offset ?? 0, (filters.offset ?? 0) + filters.limit);
}

export function filterDepartments(
  departments: readonly Department[],
  filters: DepartmentFilters,
): Department[] {
  const code = filters.code?.trim().toLowerCase();
  const name = filters.name?.trim().toLowerCase();
  return departments
    .filter((dept) => filters.includeBlocked || !dept.Blocked)
    .filter((dept) => !code || dept.Code.toLowerCase() === code)
    .filter((dept) => !name || dept.Name.toLowerCase().includes(name))
    .slice(filters.offset ?? 0, (filters.offset ?? 0) + filters.limit);
}
