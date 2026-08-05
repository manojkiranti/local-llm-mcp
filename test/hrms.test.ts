import assert from 'node:assert/strict';
import test from 'node:test';
import { listSampleEmployees, SAMPLE_EMPLOYEES } from '../src/tools/hrms/sample-data.js';

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
