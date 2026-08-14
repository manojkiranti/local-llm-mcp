import assert from 'node:assert/strict';
import test from 'node:test';
import {
  assertSafeSelectStatement,
  fetchEmsTableColumns,
  fetchEmsTables,
  getEmsDbConfig,
  isEmsConfigured,
  searchEmsRecords,
} from '../src/integrations/ems/client.js';

const CONFIG = {
  host: 'localhost',
  port: 3306,
  database: 'ems',
  user: 'svc',
  password: 'pw',
  ssl: false,
  connectionLimit: 5,
};

test('getEmsDbConfig returns undefined unless host/database/user are all set', () => {
  assert.equal(getEmsDbConfig({}), undefined);
  assert.equal(getEmsDbConfig({ EMS_DB_HOST: 'h' }), undefined);
  assert.equal(getEmsDbConfig({ EMS_DB_HOST: 'h', EMS_DB_NAME: 'db' }), undefined);
  const config = getEmsDbConfig({ EMS_DB_HOST: 'h', EMS_DB_NAME: 'db', EMS_DB_USER: 'u' });
  assert.deepEqual(config, {
    host: 'h',
    port: 3306,
    database: 'db',
    user: 'u',
    password: '',
    ssl: false,
    connectionLimit: 5,
  });
  assert.equal(isEmsConfigured({ EMS_DB_HOST: 'h', EMS_DB_NAME: 'db', EMS_DB_USER: 'u' }), true);
  assert.equal(isEmsConfigured({}), false);
});

test('getEmsDbConfig honors EMS_DB_PORT/CONNECTION_LIMIT/SSL overrides', () => {
  const config = getEmsDbConfig({
    EMS_DB_HOST: 'h',
    EMS_DB_NAME: 'db',
    EMS_DB_USER: 'u',
    EMS_DB_PORT: '3307',
    EMS_DB_CONNECTION_LIMIT: '10',
    EMS_DB_SSL: 'true',
  });
  assert.equal(config?.port, 3307);
  assert.equal(config?.connectionLimit, 10);
  assert.equal(config?.ssl, true);
});

test('getEmsDbConfig falls back to defaults for invalid port/connection limit', () => {
  const config = getEmsDbConfig({
    EMS_DB_HOST: 'h',
    EMS_DB_NAME: 'db',
    EMS_DB_USER: 'u',
    EMS_DB_PORT: 'not-a-number',
    EMS_DB_CONNECTION_LIMIT: '-1',
  });
  assert.equal(config?.port, 3306);
  assert.equal(config?.connectionLimit, 5);
});

test('assertSafeSelectStatement accepts a plain SELECT', () => {
  assert.equal(assertSafeSelectStatement('select * from expenses'), 'select * from expenses');
});

test('assertSafeSelectStatement accepts a WITH ... SELECT (CTE)', () => {
  const sql = 'WITH recent AS (SELECT * FROM expenses) SELECT * FROM recent';
  assert.equal(assertSafeSelectStatement(sql), sql);
});

test('assertSafeSelectStatement trims whitespace and one trailing semicolon', () => {
  assert.equal(assertSafeSelectStatement('  select 1;  '), 'select 1');
});

test('assertSafeSelectStatement rejects an empty query', () => {
  assert.throws(() => assertSafeSelectStatement('   '), /must not be empty/);
});

test('assertSafeSelectStatement rejects multiple statements', () => {
  assert.throws(
    () => assertSafeSelectStatement('select 1; select 2'),
    /single SQL statement is allowed/,
  );
});

test('assertSafeSelectStatement rejects queries not starting with SELECT/WITH', () => {
  assert.throws(() => assertSafeSelectStatement('SHOW TABLES'), /Only SELECT queries are allowed/);
  assert.throws(() => assertSafeSelectStatement('EXPLAIN SELECT 1'), /Only SELECT queries are allowed/);
});

test('assertSafeSelectStatement rejects write/DDL/admin statements', () => {
  const rejected = [
    "INSERT INTO expenses VALUES (1)",
    "UPDATE expenses SET amount = 0",
    "DELETE FROM expenses",
    "DROP TABLE expenses",
    "ALTER TABLE expenses ADD COLUMN x INT",
    "TRUNCATE TABLE expenses",
    "CREATE TABLE x (id INT)",
    "GRANT ALL ON *.* TO 'x'@'%'",
    "CALL some_proc()",
    "SELECT * FROM expenses INTO OUTFILE '/tmp/x.csv'",
  ];
  for (const sql of rejected) {
    assert.throws(() => assertSafeSelectStatement(sql), `expected rejection for: ${sql}`);
  }
});

test('assertSafeSelectStatement allows a column literally named like a keyword substring is fine, but rejects whole-word matches', () => {
  // "deleted_at" contains "delete" but not as a whole word — should pass.
  assert.doesNotThrow(() => assertSafeSelectStatement('SELECT deleted_at FROM expenses'));
});

test('searchEmsRecords wraps the query in a row-limited derived table and requests limit+1', async () => {
  let capturedQuery: unknown;
  let capturedValues: unknown;
  const queryImpl = async (query: { sql: string; timeout?: number }, values?: unknown[]) => {
    capturedQuery = query;
    capturedValues = values;
    return [[{ id: 1 }, { id: 2 }, { id: 3 }], undefined] as [Record<string, unknown>[], unknown];
  };

  const result = await searchEmsRecords('select id from expenses', {
    limit: 2,
    config: CONFIG,
    queryImpl,
  });

  assert.equal(result.hasMore, true);
  assert.deepEqual(result.rows, [{ id: 1 }, { id: 2 }]);
  assert.deepEqual(capturedValues, [3]);
  const sql = (capturedQuery as { sql: string }).sql;
  assert.ok(sql.includes('FROM (\nselect id from expenses\n) AS ems_query_result LIMIT ?'));
});

test('searchEmsRecords reports hasMore false when results fit within limit', async () => {
  const queryImpl = async () => [[{ id: 1 }], undefined] as [Record<string, unknown>[], unknown];
  const result = await searchEmsRecords('select id from expenses', {
    limit: 5,
    config: CONFIG,
    queryImpl,
  });
  assert.equal(result.hasMore, false);
  assert.deepEqual(result.rows, [{ id: 1 }]);
});

test('searchEmsRecords rejects unsafe SQL before ever calling the query executor', async () => {
  let called = false;
  const queryImpl = async () => {
    called = true;
    return [[], undefined] as [Record<string, unknown>[], unknown];
  };
  await assert.rejects(
    searchEmsRecords("SELECT * FROM expenses INTO OUTFILE '/tmp/x.csv'", {
      limit: 5,
      config: CONFIG,
      queryImpl,
    }),
    /disallowed keyword/,
  );
  assert.equal(called, false);
});

test('searchEmsRecords throws when EMS is not configured and no config override is given', async () => {
  await assert.rejects(
    searchEmsRecords('select 1', { limit: 5, config: undefined, queryImpl: async () => [[], undefined] }),
    /EMS_DB_HOST/,
  );
});

test('fetchEmsTables queries INFORMATION_SCHEMA.TABLES with the configured database', async () => {
  let capturedValues: unknown;
  const queryImpl = async (_query: { sql: string }, values?: unknown[]) => {
    capturedValues = values;
    return [
      [{ name: 'expenses', approxRowCount: '482', comment: 'Expense claims' }],
      undefined,
    ] as [Record<string, unknown>[], unknown];
  };
  const tables = await fetchEmsTables({ config: CONFIG, queryImpl });
  assert.deepEqual(capturedValues, ['ems']);
  assert.deepEqual(tables, [{ name: 'expenses', approxRowCount: 482, comment: 'Expense claims' }]);
});

test('fetchEmsTableColumns queries INFORMATION_SCHEMA.COLUMNS with database and table', async () => {
  let capturedValues: unknown;
  const queryImpl = async (_query: { sql: string }, values?: unknown[]) => {
    capturedValues = values;
    return [
      [
        {
          name: 'id',
          type: 'int',
          nullable: 'NO',
          key: 'PRI',
          defaultValue: null,
          comment: '',
        },
      ],
      undefined,
    ] as [Record<string, unknown>[], unknown];
  };
  const columns = await fetchEmsTableColumns('expenses', { config: CONFIG, queryImpl });
  assert.deepEqual(capturedValues, ['ems', 'expenses']);
  assert.deepEqual(columns, [
    { name: 'id', type: 'int', nullable: false, key: 'PRI', defaultValue: null, comment: '' },
  ]);
});
