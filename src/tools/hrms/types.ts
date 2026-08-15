// Field names mirror the real HRMS OData feed
// (GET /api/v1/auth/employees/active-employee) so the mock can later be
// swapped for the live API with no field mapping. All records from that feed
// are active employees, so there is no per-record employment-status field.
export type Employee = {
  '@odata.etag'?: string;
  No: string;
  Deputation_on: string;
  Sub_Province_Name: string;
  Sub_Province_Code: string;
  Mobile_Phone_No: string;
  Department_Code: string;
  Company_E_Mail: string;
  Salary_Level: string;
  Province_Name: string;
  Full_Name: string;
  Department_Name: string;
  Branch_Name: string;
  Extension_Counter_Name: string;
  Unit_Name: string;
  Unit_Code: string;
  Functional_Title: string;
  Province_Code: string;
  Eco_System: string;
  Functional_Title_Desc: string;
  Salary_Level_Description: string;
  Branch_Code: string;
  Blood_Group: string;
};

export type EmployeeFilters = {
  department?: string;
  province?: string;
  branch?: string;
  /** Exact match on the employee number (the `No` field). */
  employeeNo?: string;
  /** Case-insensitive substring match on Full_Name. */
  fullName?: string;
  /** Case-insensitive substring match across name, email, department, branch, title, and No. */
  search?: string;
  limit: number;
  /** Matching records to skip before taking `limit`, for paging. Defaults to 0. */
  offset?: number;
};

// Field names mirror the real HRMS feed
// (GET /api/v1/auth/employees/tasks?employee_id=...), which returns pending
// approval/recommendation counts for one employee. All fields besides
// primaryKey and Employee_Filter are counts.
export type EmployeeTasks = {
  '@odata.etag'?: string;
  primaryKey: string;
  To_Recommend_Attendance_Missed: number;
  To_Approve_Attendance_Missed: number;
  To_Recommend_Leave_Req: number;
  To_Approve_Leave_Request: number;
  To_Recommend_Travel_Req: number;
  To_Approve_Travel_Req: number;
  To_Recommend_Travel_Claim: number;
  To_Approve_Travel_Claim: number;
  To_Recommend_Transfer: number;
  Incoming_Branch: number;
  To_Review_Transfer: number;
  To_Approve_Overtime: number;
  To_Recommend_Overtime: number;
  To_Recommend_Resignation: number;
  To_Reviews_Resignation: number;
  To_Recommend_Salary_Advance: number;
  To_Recommend_Personal_Loan: number;
  To_Recommend_Home_Loan: number;
  To_Recommend_Vehicle_Loan: number;
  To_Recommend_Allowance_Assig: number;
  To_Recommend_Tranfer_Claim: number;
  To_Review_Transfer_Claim: number;
  /** Echoes the requested employee_id. */
  Employee_Filter: string;
};

// Field names mirror the real HRMS feed
// (GET /api/v1/auth/hr/departments).
export type Department = {
  '@odata.etag'?: string;
  Code: string;
  Name: string;
  Approver_Code: string;
  Approver_Name: string;
  Approver_Code_Second: string;
  Approver_Name_Second: string;
  Skip_Attendance_Report: boolean;
  Blocked: boolean;
};

export type DepartmentFilters = {
  /** Exact match on the department code (the `Code` field). */
  code?: string;
  /** Case-insensitive substring match on Name. */
  name?: string;
  /** Include blocked (disabled) departments. Defaults to false. */
  includeBlocked?: boolean;
  limit: number;
  /** Matching records to skip before taking `limit`, for paging. Defaults to 0. */
  offset?: number;
};
