import type { Employee } from '../../tools/hrms/types.js';

// HTTP client for the real HRMS active-employee OData feed
// (GET {HRMS_BASE_URL}). The endpoint sits on a trusted private network and
// takes no per-request auth, so no Authorization header is sent. Keep all HTTP
// concerns here; the tool layer only sees typed Employee[] results.

const DEFAULT_TIMEOUT_MS = 10_000;

export function getHrmsBaseUrl(env: NodeJS.ProcessEnv = process.env): string | undefined {
  const url = env.HRMS_BASE_URL?.trim();
  return url ? url : undefined;
}

export function isHrmsConfigured(env: NodeJS.ProcessEnv = process.env): boolean {
  return getHrmsBaseUrl(env) !== undefined;
}

type ODataEmployeesResponse = { value?: Employee[] };

export type FetchActiveEmployeesOptions = {
  /** Overrides HRMS_BASE_URL. */
  baseUrl?: string;
  /** Injectable fetch, primarily for tests. Defaults to the global fetch. */
  fetchImpl?: typeof fetch;
  /** Abort the request after this many ms. Defaults to 10s. */
  timeoutMs?: number;
  /** Optional external abort signal, combined with the internal timeout. */
  signal?: AbortSignal;
};

/**
 * Fetches active employees from the HRMS OData feed and returns the `value`
 * array. Throws on missing config, network/timeout failure, or a non-2xx
 * response. Callers apply filtering (see filterEmployees).
 */
export async function fetchActiveEmployees(
  options: FetchActiveEmployeesOptions = {},
): Promise<Employee[]> {
  const baseUrl = options.baseUrl ?? getHrmsBaseUrl();
  if (!baseUrl) {
    throw new Error('HRMS_BASE_URL is not configured.');
  }

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
    const response = await fetchImpl(baseUrl, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`HRMS request failed with HTTP ${response.status}.`);
    }
    const data = (await response.json()) as ODataEmployeesResponse;
    return Array.isArray(data.value) ? data.value : [];
  } finally {
    clearTimeout(timeout);
  }
}
