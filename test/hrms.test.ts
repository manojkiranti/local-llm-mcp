import assert from 'node:assert/strict';
import test from 'node:test';
import { listSampleEmployees, SAMPLE_EMPLOYEES } from '../src/tools/hrms/sample-data.js';

test('HRMS sample employees can be filtered by department', () => {
  const employees = listSampleEmployees({ department: 'engineering', limit: 20 });
  assert.equal(employees.length, 1);
  assert.equal(employees[0]?.department, 'Engineering');
});

test('HRMS sample employees can be filtered by employment status', () => {
  const employees = listSampleEmployees({ employmentStatus: 'on_leave', limit: 20 });
  assert.equal(employees.length, 1);
  assert.equal(employees[0]?.employmentStatus, 'on_leave');
});

test('HRMS sample employee limit is applied', () => {
  const employees = listSampleEmployees({ limit: 1 });
  assert.equal(employees.length, 1);
  assert.ok(SAMPLE_EMPLOYEES.length > employees.length);
});
