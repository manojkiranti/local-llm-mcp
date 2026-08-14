import assert from 'node:assert/strict';
import test from 'node:test';
import {
  SAMPLE_EXPENSE_RECORDS,
  SAMPLE_TABLES,
  sampleEmsRecords,
  sampleTableColumns,
} from '../src/tools/ems/sample-data.js';

test('sampleEmsRecords returns up to the requested limit', () => {
  assert.equal(sampleEmsRecords(1).length, 1);
  assert.equal(sampleEmsRecords(50).length, SAMPLE_EXPENSE_RECORDS.length);
});

test('sampleTableColumns returns the known columns for a sample table', () => {
  const columns = sampleTableColumns('expenses');
  assert.ok(columns.length > 0);
  assert.ok(columns.some((c) => c.name === 'amount'));
});

test('sampleTableColumns returns an empty array for an unknown table', () => {
  assert.deepEqual(sampleTableColumns('does_not_exist'), []);
});

test('SAMPLE_TABLES includes the expenses table', () => {
  assert.ok(SAMPLE_TABLES.some((t) => t.name === 'expenses'));
});
