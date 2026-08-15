import assert from 'node:assert/strict';
import test from 'node:test';
import {
  listSampleDepartments,
  listSampleEmployees,
  SAMPLE_DEPARTMENTS,
  SAMPLE_EMPLOYEES,
} from '../src/tools/hrms/sample-data.js';

test('HRMS sample employees can be filtered by department', () => {
  const employees = listSampleEmployees({ department: 'engineering', limit: 20 });
  assert.equal(employees.length, 1);
  assert.equal(employees[0]?.Department_Name, 'Engineering');
});

test('HRMS sample employees can be filtered by province', () => {
  const employees = listSampleEmployees({ province: 'koshi', limit: 20 });
  assert.equal(employees.length, 1);
  assert.equal(employees[0]?.Province_Name, 'Koshi');
});

test('HRMS sample employees can be filtered by branch', () => {
  const employees = listSampleEmployees({ branch: 'head office', limit: 20 });
  assert.ok(employees.length >= 1);
  assert.ok(employees.every((employee) => employee.Branch_Name === 'Head Office'));
});

test('HRMS sample employee limit is applied', () => {
  const employees = listSampleEmployees({ limit: 1 });
  assert.equal(employees.length, 1);
  assert.ok(SAMPLE_EMPLOYEES.length > employees.length);
});

test('HRMS sample employees can be looked up by employee number', () => {
  const employees = listSampleEmployees({ employeeNo: 'EMP-1002', limit: 20 });
  assert.equal(employees.length, 1);
  assert.equal(employees[0]?.Full_Name, 'Maya Gurung');
});

test('HRMS sample employees can be matched by partial full name', () => {
  const employees = listSampleEmployees({ fullName: 'sharma', limit: 20 });
  assert.equal(employees.length, 1);
  assert.equal(employees[0]?.No, 'EMP-1001');
});

test('HRMS sample employees can be found with free-text search', () => {
  const byEmail = listSampleEmployees({ search: 'gurung@example.com', limit: 20 });
  assert.equal(byEmail.length, 1);
  assert.equal(byEmail[0]?.No, 'EMP-1002');

  const byTitle = listSampleEmployees({ search: 'account executive', limit: 20 });
  assert.equal(byTitle.length, 1);
  assert.equal(byTitle[0]?.No, 'EMP-1003');
});

test('HRMS sample employees support offset-based paging', () => {
  const firstPage = listSampleEmployees({ limit: 2, offset: 0 });
  const secondPage = listSampleEmployees({ limit: 2, offset: 2 });
  assert.equal(firstPage.length, 2);
  assert.deepEqual(
    firstPage.map((e) => e.No),
    SAMPLE_EMPLOYEES.slice(0, 2).map((e) => e.No),
  );
  assert.deepEqual(
    secondPage.map((e) => e.No),
    SAMPLE_EMPLOYEES.slice(2, 4).map((e) => e.No),
  );
});

test('HRMS sample departments exclude blocked departments by default', () => {
  const departments = listSampleDepartments({ limit: 20 });
  assert.ok(departments.every((dept) => !dept.Blocked));
  assert.ok(SAMPLE_DEPARTMENTS.some((dept) => dept.Blocked));
  assert.ok(departments.length < SAMPLE_DEPARTMENTS.length);
});

test('HRMS sample departments can include blocked departments', () => {
  const departments = listSampleDepartments({ includeBlocked: true, limit: 20 });
  assert.equal(departments.length, SAMPLE_DEPARTMENTS.length);
});

test('HRMS sample departments can be filtered by name', () => {
  const departments = listSampleDepartments({ name: 'sales', limit: 20 });
  assert.equal(departments.length, 1);
  assert.equal(departments[0]?.Name, 'Sales');
});

test('HRMS sample departments can be looked up by exact code', () => {
  const departments = listSampleDepartments({ code: 'ENG', limit: 20 });
  assert.equal(departments.length, 1);
  assert.equal(departments[0]?.Name, 'Engineering');
});
