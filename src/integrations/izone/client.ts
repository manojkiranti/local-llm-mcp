import { promisify } from 'node:util';
import httpntlm from 'httpntlm';

// HTTP client for the local (on-prem) iZone SharePoint site's REST API
// (GET {IZONE_BASE_URL}_api/web/...). Unlike the HRMS feeds, SharePoint's own
// REST API is genuine OData: $select/$filter/$top are honored server-side.
// List items page via a $skiptoken cursor returned as `d.__next` — $skip has
// no effect there. The `_api/web/lists` collection and a folder's
// Files/Folders sub-collections do not return a paging cursor at all, so
// callers of those fetch a bounded window and paginate/search it in memory.
// The site requires NTLM (Windows) auth on every request — confirmed via a
// 401 + WWW-Authenticate: NTLM on the anonymous root — so
// IZONE_NTLM_USERNAME/PASSWORD are required, not an optional fallback like
// the HRMS NTLM credentials.

const DEFAULT_TIMEOUT_MS = 15_000;

const ntlmGetAsync = promisify(httpntlm.get.bind(httpntlm));

export function getIzoneBaseUrl(env: NodeJS.ProcessEnv = process.env): string | undefined {
  const url = env.IZONE_BASE_URL?.trim();
  return url ? url : undefined;
}

export function isIzoneConfigured(env: NodeJS.ProcessEnv = process.env): boolean {
  return getIzoneBaseUrl(env) !== undefined;
}

export type IzoneNtlmCredentials = {
  username: string;
  password: string;
  domain: string;
  workstation: string;
};

export function getIzoneNtlmCredentials(
  env: NodeJS.ProcessEnv = process.env,
): IzoneNtlmCredentials | undefined {
  const username = env.IZONE_NTLM_USERNAME?.trim();
  const password = env.IZONE_NTLM_PASSWORD;
  if (!username || !password) {
    return undefined;
  }
  return {
    username,
    password,
    domain: env.IZONE_NTLM_DOMAIN?.trim() ?? '',
    workstation: env.IZONE_NTLM_WORKSTATION?.trim() ?? '',
  };
}

/** Doubles single quotes for safe use inside an OData string literal, e.g. getbytitle('...'). */
export function escapeODataLiteral(value: string): string {
  return value.replace(/'/g, "''");
}

/** Percent-encodes each segment of a server-relative path while preserving its slashes. */
export function encodeServerRelativeUrl(path: string): string {
  return path
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');
}

/** Joins the site base URL with a path relative to it (no leading slash), so subsite paths survive. */
function buildIzoneUrl(baseUrl: string, relativePath: string): URL {
  const normalizedBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  return new URL(relativePath, normalizedBase);
}

export type FetchIzoneOptions = {
  /** Overrides IZONE_BASE_URL. */
  baseUrl?: string;
  /** Overrides the NTLM credentials read from IZONE_NTLM_USERNAME/PASSWORD. */
  ntlmCredentials?: IzoneNtlmCredentials;
  /** Abort the request after this many ms. Defaults to 15s. */
  timeoutMs?: number;
  /** Injectable NTLM transport, primarily for tests. */
  requestImpl?: (
    url: string,
    credentials: IzoneNtlmCredentials,
    timeoutMs: number,
  ) => Promise<{ statusCode: number; body: string }>;
};

async function defaultNtlmRequest(
  url: string,
  credentials: IzoneNtlmCredentials,
  timeoutMs: number,
): Promise<{ statusCode: number; body: string }> {
  return Promise.race([
    ntlmGetAsync({
      url,
      username: credentials.username,
      password: credentials.password,
      domain: credentials.domain,
      workstation: credentials.workstation,
      headers: { Accept: 'application/json;odata=verbose' },
    }) as Promise<{ statusCode: number; body: string }>,
    new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('iZone request timed out.')), timeoutMs);
    }),
  ]);
}

type ODataVerboseEnvelope<T> = { d: T };

/**
 * GETs a SharePoint REST URL via NTLM and returns the parsed `d` payload.
 * Throws on missing credentials, network/timeout failure, or a non-2xx
 * response.
 */
export async function fetchIzoneJson<T>(url: string, options: FetchIzoneOptions = {}): Promise<T> {
  const credentials = options.ntlmCredentials ?? getIzoneNtlmCredentials();
  if (!credentials) {
    throw new Error(
      'iZone NTLM credentials are not configured (IZONE_NTLM_USERNAME/IZONE_NTLM_PASSWORD).',
    );
  }
  const requestImpl = options.requestImpl ?? defaultNtlmRequest;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  const response = await requestImpl(url, credentials, timeoutMs);
  if (response.statusCode < 200 || response.statusCode >= 300) {
    throw new Error(`iZone request failed with HTTP ${response.statusCode}.`);
  }
  const parsed = response.body ? (JSON.parse(response.body) as Partial<ODataVerboseEnvelope<T>>) : {};
  if (!parsed || !('d' in parsed) || parsed.d === undefined) {
    throw new Error('Unexpected iZone response shape.');
  }
  return parsed.d;
}

function requireBaseUrl(options: FetchIzoneOptions): string {
  const baseUrl = options.baseUrl ?? getIzoneBaseUrl();
  if (!baseUrl) {
    throw new Error('IZONE_BASE_URL is not configured.');
  }
  return baseUrl;
}

export type IzonePage<T> = {
  results: T[];
  /** Opaque URL for the next page (SharePoint's `$skiptoken` cursor); pass back as `cursor`. */
  nextLink?: string;
};

type ODataCollection<T> = { results: T[]; __next?: string };
type WithODataMetadata<T> = T & { __metadata?: unknown };

/** Strips SharePoint's internal OData bookkeeping field — irrelevant noise for every caller here. */
function omitODataMetadata<T extends object>(entity: WithODataMetadata<T>): T {
  const { __metadata, ...rest } = entity;
  return rest as T;
}

/** Fetches one page of an OData collection resource (`d.results` / `d.__next`), with metadata stripped. */
async function fetchIzoneCollection<T extends object>(
  url: string,
  options: FetchIzoneOptions,
): Promise<IzonePage<T>> {
  const data = await fetchIzoneJson<ODataCollection<WithODataMetadata<T>>>(url, options);
  return { results: (data.results ?? []).map(omitODataMetadata), nextLink: data.__next };
}

const LISTS_PATH = '_api/web/lists';

export type IzoneListSummary = {
  Id: string;
  Title: string;
  /** SharePoint list template id, e.g. 100 = generic list, 101 = document library, 107 = tasks. */
  BaseTemplate: number;
  ItemCount: number;
};

/**
 * Fetches non-hidden lists and document libraries (title, item count, base
 * template). Honors $top server-side, but this collection does not return a
 * paging cursor, so callers fetch a bounded window and paginate/search it in
 * memory.
 */
export async function fetchIzoneLists(
  top: number,
  options: FetchIzoneOptions = {},
): Promise<IzonePage<IzoneListSummary>> {
  const url = buildIzoneUrl(requireBaseUrl(options), LISTS_PATH);
  url.searchParams.set('$select', 'Id,Title,BaseTemplate,ItemCount');
  url.searchParams.set('$filter', 'Hidden eq false');
  url.searchParams.set('$top', String(top));
  return fetchIzoneCollection(url.toString(), options);
}

export type FetchListItemsOptions = FetchIzoneOptions & {
  select?: readonly string[];
  filter?: string;
  top: number;
  /** Resume from a previous page's `nextLink`. When set, select/filter/top are ignored (baked in). */
  cursor?: string;
};

/**
 * Fetches one page of items from a list by title. Genuinely paginated
 * server-side via a $skiptoken cursor (`nextLink`) — pass a previous page's
 * `nextLink` back as `cursor` to continue; $skip has no effect on this
 * endpoint so it isn't used.
 */
export async function fetchIzoneListItems(
  listTitle: string,
  options: FetchListItemsOptions,
): Promise<IzonePage<Record<string, unknown>>> {
  if (options.cursor) {
    return fetchIzoneCollection(options.cursor, options);
  }
  const path = `_api/web/lists/getbytitle('${encodeURIComponent(escapeODataLiteral(listTitle))}')/items`;
  const url = buildIzoneUrl(requireBaseUrl(options), path);
  if (options.select?.length) {
    url.searchParams.set('$select', options.select.join(','));
  }
  if (options.filter) {
    url.searchParams.set('$filter', options.filter);
  }
  url.searchParams.set('$top', String(options.top));
  return fetchIzoneCollection(url.toString(), options);
}

export type IzoneFile = {
  Name: string;
  ServerRelativeUrl: string;
  /** SharePoint returns file size as a string (Int64). */
  Length: string;
  TimeLastModified: string;
};

export type IzoneFolder = {
  Name: string;
  ServerRelativeUrl: string;
  ItemCount: number;
};

type FolderContents = {
  Files: { results: WithODataMetadata<IzoneFile>[] };
  Folders: { results: WithODataMetadata<IzoneFolder>[] };
};

/**
 * Fetches the folders and files directly inside a server-relative folder
 * path (e.g. "/Shared Documents" or "/Shared Documents/Policies") in one
 * request via $expand. Not recursive. This collection has no server-side
 * paging, so callers filter/paginate the result in memory.
 */
export async function fetchIzoneFolderContents(
  serverRelativeUrl: string,
  options: FetchIzoneOptions = {},
): Promise<{ files: IzoneFile[]; folders: IzoneFolder[] }> {
  const encodedPath = encodeServerRelativeUrl(escapeODataLiteral(serverRelativeUrl));
  const path = `_api/web/GetFolderByServerRelativeUrl('${encodedPath}')`;
  const url = buildIzoneUrl(requireBaseUrl(options), path);
  url.searchParams.set('$expand', 'Files,Folders');
  url.searchParams.set(
    '$select',
    'Files/Name,Files/ServerRelativeUrl,Files/Length,Files/TimeLastModified,Folders/Name,Folders/ServerRelativeUrl,Folders/ItemCount',
  );
  const data = await fetchIzoneJson<FolderContents>(url.toString(), options);
  return {
    files: (data.Files?.results ?? []).map(omitODataMetadata),
    folders: (data.Folders?.results ?? []).map(omitODataMetadata),
  };
}
