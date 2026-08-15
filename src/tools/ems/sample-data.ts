import type { EmsColumnInfo, EmsTableSummary } from '../../integrations/ems/client.js';

// Mock schema/data for the EMS (Expenses Management System) database,
// returned when EMS_DB_* is not configured so the tools are exercisable
// without a live database. Shaped like a plausible expenses schema — the
// real schema is discovered via list_ems_tables once configured.

export const SAMPLE_TABLES: readonly EmsTableSummary[] = [
  { name: 'expenses', approxRowCount: 482, comment: 'Expense claims submitted by employees' },
  { name: 'expense_categories', approxRowCount: 12, comment: 'Lookup of expense categories' },
  { name: 'employees', approxRowCount: 96, comment: 'Employee directory' },
];

export const SAMPLE_COLUMNS: Readonly<Record<string, readonly EmsColumnInfo[]>> = {
  expenses: [
    { name: 'id', type: 'int', nullable: false, key: 'PRI', defaultValue: null, comment: '' },
    { name: 'employee_id', type: 'int', nullable: false, key: 'MUL', defaultValue: null, comment: '' },
    { name: 'category_id', type: 'int', nullable: false, key: 'MUL', defaultValue: null, comment: '' },
    { name: 'amount', type: 'decimal(10,2)', nullable: false, key: '', defaultValue: null, comment: '' },
    { name: 'currency', type: 'varchar(3)', nullable: false, key: '', defaultValue: 'NPR', comment: '' },
    {
      name: 'status',
      type: "enum('Pending','Approved','Rejected')",
      nullable: false,
      key: '',
      defaultValue: 'Pending',
      comment: '',
    },
    { name: 'submitted_date', type: 'date', nullable: false, key: '', defaultValue: null, comment: '' },
  ],
  expense_categories: [
    { name: 'id', type: 'int', nullable: false, key: 'PRI', defaultValue: null, comment: '' },
    { name: 'name', type: 'varchar(100)', nullable: false, key: '', defaultValue: null, comment: '' },
  ],
  employees: [
    { name: 'id', type: 'int', nullable: false, key: 'PRI', defaultValue: null, comment: '' },
    { name: 'full_name', type: 'varchar(150)', nullable: false, key: '', defaultValue: null, comment: '' },
    { name: 'department', type: 'varchar(100)', nullable: true, key: '', defaultValue: null, comment: '' },
  ],
};

export function sampleTableColumns(table: string): readonly EmsColumnInfo[] {
  return SAMPLE_COLUMNS[table] ?? [];
}

export const SAMPLE_EXPENSE_RECORDS: readonly Record<string, unknown>[] = [
  {
    id: 1,
    employee_id: 12,
    full_name: 'Aarav Sharma',
    category: 'Travel',
    amount: '4500.00',
    currency: 'NPR',
    status: 'Pending',
    submitted_date: '2026-07-20',
  },
  {
    id: 2,
    employee_id: 27,
    full_name: 'Maya Gurung',
    category: 'Office Supplies',
    amount: '1200.00',
    currency: 'NPR',
    status: 'Approved',
    submitted_date: '2026-07-18',
  },
];

/** Returns a fixed sample of expense rows, ignoring the requested SQL entirely. */
export function sampleEmsRecords(limit: number): Record<string, unknown>[] {
  return SAMPLE_EXPENSE_RECORDS.slice(0, limit);
}
