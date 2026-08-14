import assert from 'node:assert/strict';
import test from 'node:test';
import { paginateSample } from '../src/tools/hrms/query.js';
import { SAMPLE_EMPLOYEES } from '../src/tools/hrms/sample-data.js';

test('paginateSample reports hasMore when the fetched page exceeds the limit', () => {
  const overFetched = SAMPLE_EMPLOYEES.slice(0, 3); // limit 2 + 1 overfetch
  const { page, hasMore } = paginateSample(overFetched, 2);
  assert.equal(page.length, 2);
  assert.equal(hasMore, true);
});

test('paginateSample reports hasMore false when the page is not full', () => {
  const { page, hasMore } = paginateSample(SAMPLE_EMPLOYEES.slice(0, 1), 5);
  assert.equal(page.length, 1);
  assert.equal(hasMore, false);
});
