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
  limit: number;
};
