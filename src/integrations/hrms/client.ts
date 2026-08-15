import { promisify } from 'node:util';
import httpntlm from 'httpntlm';
import type { Department, Employee, EmployeeTasks } from '../../tools/hrms/types.js';

// HTTP client for the real HRMS endpoints:
// - active-employee list: GET {HRMS_BASE_URL}
//   (e.g. http://host:port/api/v1/auth/employees/active-employee). OData-shaped
//   (`{ value: Employee[] }`) but does not honor $filter/$top/$skip/$select —
//   it always returns the full active-employee list, so callers fetch
//   everything and filter/paginate in memory (see filterEmployees).
// - employee tasks: GET {origin of HRMS_BASE_URL}/api/v1/auth/employees/tasks?employee_id=...
//   (`{ value: EmployeeTasks[] }`), a single-employee lookup — employee_id is
//   required server-side and does filter the result.
// - departments: GET {origin of HRMS_BASE_URL}/api/v1/auth/hr/departments
//   (`{ value: Department[] }`), same no-server-side-filtering behavior as
//   the active-employee list.
// The on-prem host is network-trusted with no per-request auth on some
// deployments; where it requires Windows auth, requests authenticate with
// HRMS_NTLM_USERNAME/HRMS_NTLM_PASSWORD when set. Keep all HTTP concerns
// here; the tool layer only sees typed results.

const DEFAULT_TIMEOUT_MS = 10_000;

const ntlmGetAsync = promisify(httpntlm.get.bind(httpntlm));

export function getHrmsBaseUrl(env: NodeJS.ProcessEnv = process.env): string | undefined {
  const url = env.HRMS_BASE_URL?.trim();
  return url ? url : undefined;
}

export function isHrmsConfigured(env: NodeJS.ProcessEnv = process.env): boolean {
  return getHrmsBaseUrl(env) !== undefined;
}

export type HrmsNtlmCredentials = {
  username: string;
  password: string;
  domain: string;
  workstation: string;
};

/** Reads NTLM credentials for the on-prem HRMS endpoint, if configured. */
export function getHrmsNtlmCredentials(
  env: NodeJS.ProcessEnv = process.env,
): HrmsNtlmCredentials | undefined {
  const username = env.HRMS_NTLM_USERNAME?.trim();
  const password = env.HRMS_NTLM_PASSWORD;
  if (!username || !password) {
    return undefined;
  }
  return {
    username,
    password,
    domain: env.HRMS_NTLM_DOMAIN?.trim() ?? '',
    workstation: env.HRMS_NTLM_WORKSTATION?.trim() ?? '',
  };
}

type ODataValueResponse<T> = { value?: T[] };

export type FetchActiveEmployeesOptions = {
  /** Overrides HRMS_BASE_URL. */
  baseUrl?: string;
  /** Injectable fetch, primarily for tests. Defaults to the global fetch. Skips NTLM. */
  fetchImpl?: typeof fetch;
  /** Overrides the NTLM credentials read from HRMS_NTLM_USERNAME/HRMS_NTLM_PASSWORD. */
  ntlmCredentials?: HrmsNtlmCredentials;
  /** Abort the request after this many ms. Defaults to 10s. */
  timeoutMs?: number;
  /** Optional external abort signal, combined with the internal timeout. */
  signal?: AbortSignal;
};

function parseODataValue<T>(raw: string): T[] {
  const data = raw ? (JSON.parse(raw) as ODataValueResponse<T>) : {};
  return Array.isArray(data.value) ? data.value : [];
}

async function requestViaNtlm<T>(
  url: string,
  credentials: HrmsNtlmCredentials,
  timeoutMs: number,
): Promise<T[]> {
  const response = await Promise.race([
    ntlmGetAsync({
      url,
      username: credentials.username,
      password: credentials.password,
      domain: credentials.domain,
      workstation: credentials.workstation,
      headers: { Accept: 'application/json' },
    }),
    new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('HRMS request timed out.')), timeoutMs);
    }),
  ]);

  if (response.statusCode < 200 || response.statusCode >= 300) {
    throw new Error(`HRMS request failed with HTTP ${response.statusCode}.`);
  }
  return parseODataValue<T>(response.body);
}

async function requestViaFetch<T>(
  url: string,
  options: FetchActiveEmployeesOptions,
): Promise<T[]> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  if (options.signal) {
    if (options.signal.aborted) {
      controller.abort();
    } else {
      options.signal.addEventListener('abort', () => controller.abort(), { once: true });
    }
  }

  try {
    const response = await fetchImpl(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`HRMS request failed with HTTP ${response.status}.`);
    }
    return parseODataValue<T>(await response.text());
  } finally {
    clearTimeout(timeout);
  }
}

/** Shared GET-and-parse-`value`-array flow: NTLM when credentials are configured, plain fetch otherwise. */
async function requestODataValue<T>(
  url: string,
  options: FetchActiveEmployeesOptions,
): Promise<T[]> {
  // Injecting a fetchImpl (tests) always uses fetch, even if NTLM creds are set.
  const ntlmCredentials = options.fetchImpl
    ? undefined
    : (options.ntlmCredentials ?? getHrmsNtlmCredentials());

  if (ntlmCredentials) {
    return requestViaNtlm<T>(url, ntlmCredentials, options.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  }
  return requestViaFetch<T>(url, options);
}

function requireBaseUrl(options: FetchActiveEmployeesOptions): string {
  const baseUrl = options.baseUrl ?? getHrmsBaseUrl();
  if (!baseUrl) {
    throw new Error('HRMS_BASE_URL is not configured.');
  }
  return baseUrl;
}

/**
 * Fetches the full active-employee list from the HRMS feed and returns the
 * `value` array. Throws on missing config, network/timeout failure, or a
 * non-2xx response. The feed does not support server-side filtering or
 * paging, so callers apply both client-side (see filterEmployees).
 */
export async function fetchActiveEmployees(
  options: FetchActiveEmployeesOptions = {},
): Promise<Employee[]> {
  return requestODataValue<Employee>(requireBaseUrl(options), options);
}

const EMPLOYEE_TASKS_PATH = '/api/v1/auth/employees/tasks';

/**
 * Fetches task/approval counts for a single employee from the HRMS tasks
 * endpoint, which lives on the same host as HRMS_BASE_URL (its origin is
 * reused; only the path and query differ). `employeeId` is required by the
 * server — it 400s without it — and does filter the response, unlike the
 * active-employee feed's ignored query params. Returns the `value` array,
 * normally holding zero or one record.
 */
export async function fetchEmployeeTasks(
  employeeId: string,
  options: FetchActiveEmployeesOptions = {},
): Promise<EmployeeTasks[]> {
  const url = new URL(EMPLOYEE_TASKS_PATH, requireBaseUrl(options));
  url.searchParams.set('employee_id', employeeId);
  return requestODataValue<EmployeeTasks>(url.toString(), options);
}

const DEPARTMENTS_PATH = '/api/v1/auth/hr/departments';

/**
 * Fetches the full department list from the HRMS departments endpoint, which
 * lives on the same host as HRMS_BASE_URL (its origin is reused; only the
 * path differs). Like the active-employee feed, it ignores $filter/$top/$skip
 * and always returns every department, so callers filter/paginate in memory
 * (see filterDepartments).
 */
export async function fetchDepartments(
  options: FetchActiveEmployeesOptions = {},
): Promise<Department[]> {
  const url = new URL(DEPARTMENTS_PATH, requireBaseUrl(options));
  return requestODataValue<Department>(url.toString(), options);
}
