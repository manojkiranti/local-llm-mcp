import assert from 'node:assert/strict';
import test from 'node:test';
import {
  encodeServerRelativeUrl,
  escapeODataLiteral,
  fetchIzoneFolderContents,
  fetchIzoneJson,
  fetchIzoneListItems,
  fetchIzoneLists,
  getIzoneBaseUrl,
  getIzoneNtlmCredentials,
  isIzoneConfigured,
} from '../src/integrations/izone/client.js';

const CREDS = { username: 'svc', password: 'pw', domain: '', workstation: '' };

function jsonRequestImpl(body: unknown, statusCode = 200) {
  return async () => ({ statusCode, body: JSON.stringify(body) });
}

function capturingRequestImpl(body: unknown, statusCode = 200) {
  let requestedUrl = '';
  const impl = async (url: string) => {
    requestedUrl = url;
    return { statusCode, body: JSON.stringify(body) };
  };
  return { impl, getUrl: () => requestedUrl };
}

test('getIzoneBaseUrl returns undefined when unset or blank', () => {
  assert.equal(getIzoneBaseUrl({}), undefined);
  assert.equal(getIzoneBaseUrl({ IZONE_BASE_URL: '   ' }), undefined);
  assert.equal(getIzoneBaseUrl({ IZONE_BASE_URL: 'http://host/' }), 'http://host/');
  assert.equal(isIzoneConfigured({ IZONE_BASE_URL: 'http://host/' }), true);
  assert.equal(isIzoneConfigured({}), false);
});

test('getIzoneNtlmCredentials returns undefined unless username and password are set', () => {
  assert.equal(getIzoneNtlmCredentials({}), undefined);
  assert.equal(getIzoneNtlmCredentials({ IZONE_NTLM_USERNAME: 'svc' }), undefined);
  assert.deepEqual(
    getIzoneNtlmCredentials({ IZONE_NTLM_USERNAME: 'svc', IZONE_NTLM_PASSWORD: 'pw' }),
    { username: 'svc', password: 'pw', domain: '', workstation: '' },
  );
});

test('escapeODataLiteral doubles single quotes', () => {
  assert.equal(escapeODataLiteral(`O'Brien's`), `O''Brien''s`);
});

test('encodeServerRelativeUrl percent-encodes segments while preserving slashes', () => {
  assert.equal(
    encodeServerRelativeUrl('/Shared Documents/Sub Folder'),
    '/Shared%20Documents/Sub%20Folder',
  );
});

test('fetchIzoneJson throws when NTLM credentials are not configured', async () => {
  await assert.rejects(
    fetchIzoneJson('http://host/_api/web', { ntlmCredentials: undefined, requestImpl: jsonRequestImpl({}) }),
    /IZONE_NTLM_USERNAME/,
  );
});

test('fetchIzoneJson throws on a non-2xx response', async () => {
  await assert.rejects(
    fetchIzoneJson('http://host/_api/web', {
      ntlmCredentials: CREDS,
      requestImpl: jsonRequestImpl({ d: {} }, 401),
    }),
    /HTTP 401/,
  );
});

test('fetchIzoneJson throws on an unexpected response shape', async () => {
  await assert.rejects(
    fetchIzoneJson('http://host/_api/web', {
      ntlmCredentials: CREDS,
      requestImpl: jsonRequestImpl({ notD: true }),
    }),
    /Unexpected iZone response shape/,
  );
});

test('fetchIzoneJson returns the parsed d payload', async () => {
  const result = await fetchIzoneJson('http://host/_api/web', {
    ntlmCredentials: CREDS,
    requestImpl: jsonRequestImpl({ d: { Title: 'Team Site' } }),
  });
  assert.deepEqual(result, { Title: 'Team Site' });
});

test('fetchIzoneLists requests $select/$filter/$top and strips __metadata', async () => {
  const { impl, getUrl } = capturingRequestImpl({
    d: { results: [{ __metadata: { type: 'SP.List' }, Id: '1', Title: 'Department', BaseTemplate: 100, ItemCount: 5 }] },
  });
  const page = await fetchIzoneLists(50, { baseUrl: 'http://host/', ntlmCredentials: CREDS, requestImpl: impl });
  const url = getUrl();
  assert.ok(url.startsWith('http://host/_api/web/lists?'));
  assert.ok(url.includes('%24select=Id%2CTitle%2CBaseTemplate%2CItemCount'));
  assert.ok(url.includes('%24filter=Hidden+eq+false'));
  assert.ok(url.includes('%24top=50'));
  assert.deepEqual(page.results, [{ Id: '1', Title: 'Department', BaseTemplate: 100, ItemCount: 5 }]);
  assert.equal(page.nextLink, undefined);
});

test('fetchIzoneLists resolves relative to a subsite base URL', async () => {
  const { impl, getUrl } = capturingRequestImpl({ d: { results: [] } });
  await fetchIzoneLists(10, {
    baseUrl: 'http://host/sites/hr',
    ntlmCredentials: CREDS,
    requestImpl: impl,
  });
  assert.ok(getUrl().startsWith('http://host/sites/hr/_api/web/lists?'));
});

test('fetchIzoneListItems builds the getbytitle URL with select/filter/top', async () => {
  const { impl, getUrl } = capturingRequestImpl({
    d: { results: [{ __metadata: {}, Id: 1, Title: 'Sales' }], __next: 'http://host/next' },
  });
  const page = await fetchIzoneListItems('Sales & Ops', {
    baseUrl: 'http://host/',
    select: ['Id', 'Title'],
    filter: "Status eq 'Active'",
    top: 5,
    ntlmCredentials: CREDS,
    requestImpl: impl,
  });
  const url = getUrl();
  assert.ok(url.includes("getbytitle('Sales%20%26%20Ops')/items"));
  assert.ok(url.includes('%24select=Id%2CTitle'));
  assert.ok(url.includes('%24filter=Status+eq+%27Active%27'));
  assert.ok(url.includes('%24top=5'));
  assert.deepEqual(page.results, [{ Id: 1, Title: 'Sales' }]);
  assert.equal(page.nextLink, 'http://host/next');
});

test('fetchIzoneListItems uses the cursor URL directly when given, ignoring other options', async () => {
  const { impl, getUrl } = capturingRequestImpl({ d: { results: [] } });
  await fetchIzoneListItems('Ignored', {
    baseUrl: 'http://host/',
    top: 5,
    cursor: 'http://host/_api/web/lists/getbytitle(\'X\')/items?%24skiptoken=Paged%3dTRUE%26p_ID%3d3',
    ntlmCredentials: CREDS,
    requestImpl: impl,
  });
  assert.equal(getUrl(), "http://host/_api/web/lists/getbytitle('X')/items?%24skiptoken=Paged%3dTRUE%26p_ID%3d3");
});

test('fetchIzoneFolderContents requests $expand=Files,Folders and strips __metadata', async () => {
  const { impl, getUrl } = capturingRequestImpl({
    d: {
      Files: { results: [{ __metadata: {}, Name: 'a.txt', ServerRelativeUrl: '/Shared Documents/a.txt', Length: '10', TimeLastModified: '2026-01-01T00:00:00Z' }] },
      Folders: { results: [{ __metadata: {}, Name: 'Sub', ServerRelativeUrl: '/Shared Documents/Sub', ItemCount: 2 }] },
    },
  });
  const { files, folders } = await fetchIzoneFolderContents('/Shared Documents', {
    baseUrl: 'http://host/',
    ntlmCredentials: CREDS,
    requestImpl: impl,
  });
  const url = getUrl();
  assert.ok(url.includes("GetFolderByServerRelativeUrl('/Shared%20Documents')"));
  assert.ok(url.includes('%24expand=Files%2CFolders'));
  assert.deepEqual(files, [
    { Name: 'a.txt', ServerRelativeUrl: '/Shared Documents/a.txt', Length: '10', TimeLastModified: '2026-01-01T00:00:00Z' },
  ]);
  assert.deepEqual(folders, [{ Name: 'Sub', ServerRelativeUrl: '/Shared Documents/Sub', ItemCount: 2 }]);
});

test('fetchIzoneFolderContents throws when no base URL is configured', async () => {
  await assert.rejects(
    fetchIzoneFolderContents('/Shared Documents', {
      baseUrl: '',
      ntlmCredentials: CREDS,
      requestImpl: jsonRequestImpl({ d: {} }),
    }),
    /IZONE_BASE_URL is not configured/,
  );
});
