import type { IzoneCountryCircular } from '../../tools/izone/types.js';

// HTTP client for the iZone "Country Circular" search feature. Unlike
// client.ts (the SharePoint REST API, NTLM-authenticated, genuine OData),
// this hits a separate internal API that isn't part of SharePoint at all —
// discovered by reading the inline JavaScript on
// http://izone3.nicasiabank.com/Application/Search%20Country%20Circular.aspx,
// which calls this endpoint directly rather than using SharePoint's REST API.
// It takes no query parameters and no auth, and always returns the full
// circular index (~12k rows, ~4MB) as a plain JSON array; the page's own
// DataTables widget does search/paging client-side in the browser, so this
// client fetches everything and callers filter/paginate in memory (see
// filterCountryCirculars in tools/izone/filter.ts).

const DEFAULT_TIMEOUT_MS = 20_000;

export function getIzoneCountryCircularUrl(env: NodeJS.ProcessEnv = process.env): string | undefined {
  const url = env.IZONE_COUNTRY_CIRCULAR_URL?.trim();
  return url ? url : undefined;
}

export function isIzoneCountryCircularConfigured(env: NodeJS.ProcessEnv = process.env): boolean {
  return getIzoneCountryCircularUrl(env) !== undefined;
}

export type FetchCountryCircularsOptions = {
  /** Overrides IZONE_COUNTRY_CIRCULAR_URL. */
  baseUrl?: string;
  /** Injectable fetch, primarily for tests. Defaults to the global fetch. */
  fetchImpl?: typeof fetch;
  /** Abort the request after this many ms. Defaults to 20s (the response is several MB). */
  timeoutMs?: number;
  /** Optional external abort signal, combined with the internal timeout. */
  signal?: AbortSignal;
};

/**
 * Fetches the full Country Circular index. Throws on missing config,
 * network/timeout failure, or a non-2xx response.
 */
export async function fetchIzoneCountryCirculars(
  options: FetchCountryCircularsOptions = {},
): Promise<IzoneCountryCircular[]> {
  const url = options.baseUrl ?? getIzoneCountryCircularUrl();
  if (!url) {
    throw new Error('IZONE_COUNTRY_CIRCULAR_URL is not configured.');
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
    const response = await fetchImpl(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`iZone Country Circular request failed with HTTP ${response.status}.`);
    }
    const data = (await response.json()) as unknown;
    return Array.isArray(data) ? (data as IzoneCountryCircular[]) : [];
  } finally {
    clearTimeout(timeout);
  }
}

const VIEWER_BASE_URL = 'http://izonedoc.nicasiabank.com/view/';

/** Builds the document viewer link the search page itself links out to for a given circular. */
export function buildCountryCircularViewUrl(
  circular: Pick<IzoneCountryCircular, 'Name'>,
): string | undefined {
  return circular.Name ? `${VIEWER_BASE_URL}${encodeURIComponent(circular.Name)}` : undefined;
}
