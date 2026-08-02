import assert from 'node:assert/strict';
import test from 'node:test';
import { getServerConfig } from '../src/config.js';

test('server configuration uses safe local defaults', () => {
  assert.deepEqual(getServerConfig({ MCP_SERVICE_TOKEN: 'secret' }), {
    serviceToken: 'secret',
    host: '127.0.0.1',
    port: 3333,
    endpoint: '/mcp',
  });
});

test('server configuration rejects a missing service token', () => {
  assert.throws(() => getServerConfig({}), /MCP_SERVICE_TOKEN is required/);
});

test('server configuration rejects an invalid port', () => {
  assert.throws(
    () => getServerConfig({ MCP_SERVICE_TOKEN: 'secret', PORT: '70000' }),
    /PORT must be an integer from 1 to 65535/,
  );
});
