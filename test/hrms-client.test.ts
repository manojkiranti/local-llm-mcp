import assert from 'node:assert/strict';
import test from 'node:test';
import {
  fetchActiveEmployees,
  getHrmsBaseUrl,
  isHrmsConfigured,
} from '../src/integrations/hrms/client.js';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

test('getHrmsBaseUrl returns undefined when unset or blank', () => {
  assert.equal(getHrmsBaseUrl({}), undefined);
  assert.equal(getHrmsBaseUrl({ HRMS_BASE_URL: '   ' }), undefined);
  assert.equal(getHrmsBaseUrl({ HRMS_BASE_URL: 'http://host/feed' }), 'http://host/feed');
  assert.equal(isHrmsConfigured({ HRMS_BASE_URL: 'http://host/feed' }), true);
  assert.equal(isHrmsConfigured({}), false);
});

test('fetchActiveEmployees returns the OData value array', async () => {
  const fetchImpl = async () => jsonResponse({ value: [{ Full_Name: 'Test User' }] });
  const employees = await fetchActiveEmployees({
    baseUrl: 'http://host/feed',
    fetchImpl: fetchImpl as typeof fetch,
  });
  assert.equal(employees.length, 1);
  assert.equal(employees[0]?.Full_Name, 'Test User');
});

test('fetchActiveEmployees returns [] when value is missing', async () => {
  const fetchImpl = async () => jsonResponse({ '@odata.context': 'x' });
  const employees = await fetchActiveEmployees({
    baseUrl: 'http://host/feed',
    fetchImpl: fetchImpl as typeof fetch,
  });
  assert.deepEqual(employees, []);
});

test('fetchActiveEmployees throws on a non-2xx response', async () => {
  const fetchImpl = async () => jsonResponse({ error: 'nope' }, 500);
  await assert.rejects(
    fetchActiveEmployees({ baseUrl: 'http://host/feed', fetchImpl: fetchImpl as typeof fetch }),
    /HTTP 500/,
  );
});

test('fetchActiveEmployees throws when no base URL is configured', async () => {
  await assert.rejects(
    fetchActiveEmployees({ baseUrl: '', fetchImpl: (async () => jsonResponse({})) as typeof fetch }),
    /HRMS_BASE_URL is not configured/,
  );
});
