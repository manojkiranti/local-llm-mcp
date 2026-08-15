import assert from 'node:assert/strict';
import test from 'node:test';
import { paginate } from '../src/tools/izone/filter.js';
import {
  listSampleCountryCirculars,
  listSampleFolderEntries,
  listSampleLists,
  SAMPLE_COUNTRY_CIRCULARS,
  SAMPLE_FOLDER_ENTRIES,
  SAMPLE_LISTS,
} from '../src/tools/izone/sample-data.js';

test('iZone sample lists can be searched by title substring', () => {
  const lists = listSampleLists({ search: 'policies', limit: 20 });
  assert.equal(lists.length, 1);
  assert.equal(lists[0]?.Title, 'Policies');
});

test('iZone sample lists limit is applied', () => {
  const lists = listSampleLists({ limit: 1 });
  assert.equal(lists.length, 1);
  assert.ok(SAMPLE_LISTS.length > lists.length);
});

test('iZone sample lists support offset-based paging', () => {
  const firstPage = listSampleLists({ limit: 2, offset: 0 });
  const secondPage = listSampleLists({ limit: 2, offset: 2 });
  assert.deepEqual(
    firstPage.map((l) => l.Id),
    SAMPLE_LISTS.slice(0, 2).map((l) => l.Id),
  );
  assert.deepEqual(
    secondPage.map((l) => l.Id),
    SAMPLE_LISTS.slice(2, 4).map((l) => l.Id),
  );
});

test('iZone sample folder entries can be searched by name substring', () => {
  const entries = listSampleFolderEntries({ search: 'leave', limit: 20 });
  assert.equal(entries.length, 1);
  assert.equal(entries[0]?.Name, 'Leave Policy.docx');
});

test('iZone sample folder entries include both folders and files', () => {
  const entries = listSampleFolderEntries({ limit: 20 });
  assert.equal(entries.length, SAMPLE_FOLDER_ENTRIES.length);
  assert.ok(entries.some((e) => e.entryType === 'folder'));
  assert.ok(entries.some((e) => e.entryType === 'file'));
});

test('iZone sample country circulars can be found by free-text search', () => {
  const circulars = listSampleCountryCirculars({ search: 'leave policy', limit: 20 });
  assert.equal(circulars.length, 1);
  assert.equal(circulars[0]?.Title, 'Revised Leave Policy for Fiscal Year');
});

test('iZone sample country circulars can be filtered by exact status', () => {
  const circulars = listSampleCountryCirculars({ status: 'Obsolete', limit: 20 });
  assert.equal(circulars.length, 1);
  assert.equal(circulars[0]?.CircularStatus, 'Obsolete');
});

test('iZone sample country circulars can be filtered by category substring', () => {
  const circulars = listSampleCountryCirculars({ category: 'bulletin', limit: 20 });
  assert.equal(circulars.length, 1);
  assert.ok(circulars[0]?.CircularCategory.toLowerCase().includes('bulletin'));
});

test('iZone sample country circulars can be filtered by originator', () => {
  const circulars = listSampleCountryCirculars({ originator: 'Human Resources', limit: 20 });
  assert.equal(circulars.length, 1);
  assert.equal(circulars[0]?.Originator, 'Human Resources');
});

test('iZone sample country circulars limit is applied', () => {
  const circulars = listSampleCountryCirculars({ limit: 1 });
  assert.equal(circulars.length, 1);
  assert.ok(SAMPLE_COUNTRY_CIRCULARS.length > circulars.length);
});

test('paginate reports hasMore when the fetched page exceeds the limit', () => {
  const overFetched = [1, 2, 3]; // limit 2 + 1 overfetch
  const { page, hasMore } = paginate(overFetched, 2);
  assert.deepEqual(page, [1, 2]);
  assert.equal(hasMore, true);
});

test('paginate reports hasMore false when the page is not full', () => {
  const { page, hasMore } = paginate([1], 5);
  assert.deepEqual(page, [1]);
  assert.equal(hasMore, false);
});
