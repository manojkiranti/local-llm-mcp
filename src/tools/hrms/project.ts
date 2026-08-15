import type { Employee } from './types.js';

// Compact field set returned by default so multi-employee results stay well
// under chat response character limits. employeeDetailsEntities returns 80+
// fields per record; requesting them all for a list of 10+ employees blows
// past that limit. Every field filterEmployees/search rely on is included.
export const SUMMARY_FIELDS = [
  'No',
  'Full_Name',
  'Functional_Title',
  'Functional_Title_Desc',
  'Department_Name',
  'Branch_Name',
  'Unit_Name',
  'Province_Name',
  'Company_E_Mail',
  'Mobile_Phone_No',
  'Blood_Group',
] as const satisfies readonly (keyof Employee)[];

export type EmployeeSummary = Pick<Employee, (typeof SUMMARY_FIELDS)[number]>;

export function toSummary(employee: Employee): EmployeeSummary {
  const summary = {} as EmployeeSummary;
  for (const field of SUMMARY_FIELDS) {
    summary[field] = employee[field];
  }
  return summary;
}
