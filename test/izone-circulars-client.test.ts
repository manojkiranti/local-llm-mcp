import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildCountryCircularViewUrl,
  fetchIzoneCountryCirculars,
  getIzoneCountryCircularUrl,
  isIzoneCountryCircularConfigured,
} from '../src/integrations/izone/circulars-client.js';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

test('getIzoneCountryCircularUrl returns undefined when unset or blank', () => {
  assert.equal(getIzoneCountryCircularUrl({}), undefined);
  assert.equal(getIzoneCountryCircularUrl({ IZONE_COUNTRY_CIRCULAR_URL: '   ' }), undefined);
  assert.equal(
    getIzoneCountryCircularUrl({ IZONE_COUNTRY_CIRCULAR_URL: 'http://host/api' }),
    'http://host/api',
  );
  assert.equal(isIzoneCountryCircularConfigured({ IZONE_COUNTRY_CIRCULAR_URL: 'http://host/api' }), true);
  assert.equal(isIzoneCountryCircularConfigured({}), false);
});

test('fetchIzoneCountryCirculars GETs the configured URL and returns the plain array', async () => {
  let requestedUrl = '';
  const fetchImpl = (async (url: string) => {
    requestedUrl = url;
    return jsonResponse([{ Id: 1, Title: 'Test Circular' }]);
  }) as typeof fetch;

  const circulars = await fetchIzoneCountryCirculars({ baseUrl: 'http://host/api/LoadCountryCircular', fetchImpl });
  assert.equal(requestedUrl, 'http://host/api/LoadCountryCircular');
  assert.equal(circulars.length, 1);
  assert.equal(circulars[0]?.Title, 'Test Circular');
});

test('fetchIzoneCountryCirculars returns [] when the response is not an array', async () => {
  const fetchImpl = async () => jsonResponse({ unexpected: true });
  const circulars = await fetchIzoneCountryCirculars({
    baseUrl: 'http://host/api',
    fetchImpl: fetchImpl as typeof fetch,
  });
  assert.deepEqual(circulars, []);
});

test('fetchIzoneCountryCirculars throws on a non-2xx response', async () => {
  const fetchImpl = async () => jsonResponse({ error: 'nope' }, 500);
  await assert.rejects(
    fetchIzoneCountryCirculars({ baseUrl: 'http://host/api', fetchImpl: fetchImpl as typeof fetch }),
    /HTTP 500/,
  );
});

test('fetchIzoneCountryCirculars throws when no URL is configured', async () => {
  await assert.rejects(
    fetchIzoneCountryCirculars({ baseUrl: '', fetchImpl: (async () => jsonResponse([])) as typeof fetch }),
    /IZONE_COUNTRY_CIRCULAR_URL is not configured/,
  );
});

test('buildCountryCircularViewUrl encodes the file name into the viewer URL', () => {
  assert.equal(
    buildCountryCircularViewUrl({ Name: 'CC 09 2012-2013.pdf' }),
    'http://izonedoc.nicasiabank.com/view/CC%2009%202012-2013.pdf',
  );
});

test('buildCountryCircularViewUrl returns undefined for a missing file name', () => {
  assert.equal(buildCountryCircularViewUrl({ Name: '' }), undefined);
});
