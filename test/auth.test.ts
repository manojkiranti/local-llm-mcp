import assert from 'node:assert/strict';
import type { IncomingMessage } from 'node:http';
import test from 'node:test';
import { createAuthenticate } from '../src/auth/service-token.js';

function request(headers: IncomingMessage['headers']): IncomingMessage {
  return { headers } as IncomingMessage;
}

test('valid bearer token authenticates at service level', async () => {
  const authenticate = createAuthenticate('shared-secret');
  assert.deepEqual(await authenticate(request({ authorization: 'Bearer shared-secret' })), { userEmail: null });
});

test('optional X-User-Email is attached to the session', async () => {
  const authenticate = createAuthenticate('shared-secret');
  assert.deepEqual(await authenticate(request({
    authorization: 'Bearer shared-secret',
    'x-user-email': 'person@example.com',
  })), { userEmail: 'person@example.com' });
});

for (const [label, authorization] of [
  ['missing token', undefined],
  ['wrong token', 'Bearer wrong-secret'],
  ['wrong scheme', 'Basic shared-secret'],
] as const) {
  test(`${label} is rejected with HTTP 401`, async () => {
    const authenticate = createAuthenticate('shared-secret');
    await assert.rejects(
      authenticate(request({ authorization })),
      (error: unknown) => error instanceof Response && error.status === 401,
    );
  });
}

test('empty configured token rejects every request', async () => {
  const authenticate = createAuthenticate('');
  await assert.rejects(
    authenticate(request({ authorization: 'Bearer anything' })),
    (error: unknown) => error instanceof Response && error.status === 401,
  );
});
