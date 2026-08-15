import { fetchActiveEmployees, fetchDepartments } from '../../integrations/hrms/client.js';
import { filterDepartments, filterEmployees } from './filter.js';
import type { Department, DepartmentFilters, Employee, EmployeeFilters } from './types.js';

export type Page<T> = {
  page: T[];
  hasMore: boolean;
};

/** Applies the one-extra-record pagination trick to an in-memory list. */
export function paginateSample<T>(matched: readonly T[], limit: number): Page<T> {
  const hasMore = matched.length > limit;
  return { page: hasMore ? matched.slice(0, limit) : [...matched], hasMore };
}

// The live HRMS feed returns every active employee on each request (it does
// not support server-side $filter/$top/$skip), so a page is produced by
// fetching the full list once and filtering/paginating it in memory — the
// same path used for the sample data fallback, so both behave identically.
export async function fetchEmployeePage(filters: EmployeeFilters): Promise<Page<Employee>> {
  const employees = await fetchActiveEmployees();
  const matched = filterEmployees(employees, { ...filters, limit: filters.limit + 1 });
  return paginateSample(matched, filters.limit);
}

// Same fetch-everything-then-filter-in-memory approach as fetchEmployeePage —
// the departments endpoint also ignores server-side $filter/$top/$skip.
export async function fetchDepartmentPage(filters: DepartmentFilters): Promise<Page<Department>> {
  const departments = await fetchDepartments();
  const matched = filterDepartments(departments, { ...filters, limit: filters.limit + 1 });
  return paginateSample(matched, filters.limit);
}
