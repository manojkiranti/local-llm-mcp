import assert from 'node:assert/strict';
import test from 'node:test';
import {
  fetchActiveEmployees,
  fetchDepartments,
  fetchEmployeeTasks,
  getHrmsBaseUrl,
  getHrmsNtlmCredentials,
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

test('getHrmsNtlmCredentials returns undefined unless username and password are set', () => {
  assert.equal(getHrmsNtlmCredentials({}), undefined);
  assert.equal(getHrmsNtlmCredentials({ HRMS_NTLM_USERNAME: 'svc' }), undefined);
  assert.deepEqual(
    getHrmsNtlmCredentials({ HRMS_NTLM_USERNAME: 'svc', HRMS_NTLM_PASSWORD: 'pw' }),
    { username: 'svc', password: 'pw', domain: '', workstation: '' },
  );
});

test('fetchActiveEmployees GETs HRMS_BASE_URL directly and returns the value array', async () => {
  let requestedUrl = '';
  const fetchImpl = (async (url: string) => {
    requestedUrl = url;
    return jsonResponse({ value: [{ Full_Name: 'Test User' }] });
  }) as typeof fetch;

  const employees = await fetchActiveEmployees({
    baseUrl: 'http://host/api/v1/auth/employees/active-employee',
    fetchImpl,
  });
  assert.equal(requestedUrl, 'http://host/api/v1/auth/employees/active-employee');
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

test('fetchEmployeeTasks requests the tasks path on the base URL origin with employee_id', async () => {
  let requestedUrl = '';
  const fetchImpl = (async (url: string) => {
    requestedUrl = url;
    return jsonResponse({ value: [{ Employee_Filter: 'AA1228' }] });
  }) as typeof fetch;

  const tasks = await fetchEmployeeTasks('AA1228', {
    baseUrl: 'http://host:2080/api/v1/auth/employees/active-employee',
    fetchImpl,
  });
  assert.equal(requestedUrl, 'http://host:2080/api/v1/auth/employees/tasks?employee_id=AA1228');
  assert.equal(tasks.length, 1);
  assert.equal(tasks[0]?.Employee_Filter, 'AA1228');
});

test('fetchEmployeeTasks URL-encodes the employee id', async () => {
  let requestedUrl = '';
  const fetchImpl = (async (url: string) => {
    requestedUrl = url;
    return jsonResponse({ value: [] });
  }) as typeof fetch;

  await fetchEmployeeTasks('AA 1228/x', {
    baseUrl: 'http://host/api/v1/auth/employees/active-employee',
    fetchImpl,
  });
  assert.equal(requestedUrl, 'http://host/api/v1/auth/employees/tasks?employee_id=AA+1228%2Fx');
});

test('fetchEmployeeTasks throws when no base URL is configured', async () => {
  await assert.rejects(
    fetchEmployeeTasks('AA1228', {
      baseUrl: '',
      fetchImpl: (async () => jsonResponse({})) as typeof fetch,
    }),
    /HRMS_BASE_URL is not configured/,
  );
});

test('fetchDepartments requests the departments path on the base URL origin', async () => {
  let requestedUrl = '';
  const fetchImpl = (async (url: string) => {
    requestedUrl = url;
    return jsonResponse({ value: [{ Code: 'ENG', Name: 'Engineering' }] });
  }) as typeof fetch;

  const departments = await fetchDepartments({
    baseUrl: 'http://host:2080/api/v1/auth/employees/active-employee',
    fetchImpl,
  });
  assert.equal(requestedUrl, 'http://host:2080/api/v1/auth/hr/departments');
  assert.equal(departments.length, 1);
  assert.equal(departments[0]?.Name, 'Engineering');
});

test('fetchDepartments throws when no base URL is configured', async () => {
  await assert.rejects(
    fetchDepartments({ baseUrl: '', fetchImpl: (async () => jsonResponse({})) as typeof fetch }),
    /HRMS_BASE_URL is not configured/,
  );
});
