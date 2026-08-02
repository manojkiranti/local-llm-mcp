import type { Employee, EmployeeFilters } from './types.js';

export const SAMPLE_EMPLOYEES: readonly Employee[] = [
  {
    id: 'EMP-1001',
    fullName: 'Aarav Sharma',
    email: 'aarav.sharma@example.com',
    department: 'Engineering',
    jobTitle: 'Software Engineer',
    employmentStatus: 'active',
    startDate: '2024-02-12',
  },
  {
    id: 'EMP-1002',
    fullName: 'Maya Gurung',
    email: 'maya.gurung@example.com',
    department: 'People Operations',
    jobTitle: 'HR Specialist',
    employmentStatus: 'active',
    startDate: '2023-08-21',
  },
  {
    id: 'EMP-1003',
    fullName: 'Noah Williams',
    email: 'noah.williams@example.com',
    department: 'Sales',
    jobTitle: 'Account Executive',
    employmentStatus: 'on_leave',
    startDate: '2022-11-07',
  },
];

export function listSampleEmployees(filters: EmployeeFilters): Employee[] {
  const department = filters.department?.trim().toLowerCase();
  return SAMPLE_EMPLOYEES
    .filter((employee) => !department || employee.department.toLowerCase() === department)
    .filter((employee) =>
      !filters.employmentStatus || employee.employmentStatus === filters.employmentStatus,
    )
    .slice(0, filters.limit);
}
