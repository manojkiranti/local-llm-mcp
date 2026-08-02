export const EMPLOYMENT_STATUSES = ['active', 'on_leave', 'inactive'] as const;

export type EmploymentStatus = (typeof EMPLOYMENT_STATUSES)[number];

export type Employee = {
  id: string;
  fullName: string;
  email: string;
  department: string;
  jobTitle: string;
  employmentStatus: EmploymentStatus;
  startDate: string;
};

export type EmployeeFilters = {
  department?: string;
  employmentStatus?: EmploymentStatus;
  limit: number;
};
