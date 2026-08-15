import mysql from 'mysql2/promise';

// MySQL client for the EMS (Expenses Management System) database. Provides
// safe, read-only SQL execution: every query passed to searchEmsRecords is
// validated to be a single SELECT statement (see assertSafeSelectStatement)
// and then executed wrapped in a row-limited derived table
// (`SELECT * FROM (<query>) AS ems_query_result LIMIT ?`). That wrap is the
// real guarantee — MySQL cannot parse an INSERT/UPDATE/DDL/second statement
// inside that FROM clause, so it structurally rejects what the keyword
// check might miss. Schema discovery (list_ems_tables) reads
// INFORMATION_SCHEMA with parameterized queries built by this module, never
// with user-supplied SQL.

const DEFAULT_PORT = 3306;
const DEFAULT_CONNECTION_LIMIT = 5;
const DEFAULT_QUERY_TIMEOUT_MS = 10_000;

export type EmsDbConfig = {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  ssl: boolean;
  connectionLimit: number;
};

export function getEmsDbConfig(env: NodeJS.ProcessEnv = process.env): EmsDbConfig | undefined {
  const host = env.EMS_DB_HOST?.trim();
  const database = env.EMS_DB_NAME?.trim();
  const user = env.EMS_DB_USER?.trim();
  if (!host || !database || !user) {
    return undefined;
  }
  const port = Number(env.EMS_DB_PORT ?? DEFAULT_PORT);
  const connectionLimit = Number(env.EMS_DB_CONNECTION_LIMIT ?? DEFAULT_CONNECTION_LIMIT);
  return {
    host,
    port: Number.isInteger(port) && port > 0 ? port : DEFAULT_PORT,
    database,
    user,
    password: env.EMS_DB_PASSWORD ?? '',
    ssl: env.EMS_DB_SSL?.trim().toLowerCase() === 'true',
    connectionLimit:
      Number.isInteger(connectionLimit) && connectionLimit > 0
        ? connectionLimit
        : DEFAULT_CONNECTION_LIMIT,
  };
}

export function isEmsConfigured(env: NodeJS.ProcessEnv = process.env): boolean {
  return getEmsDbConfig(env) !== undefined;
}

let cachedPool: mysql.Pool | undefined;
let cachedPoolKey: string | undefined;

/** Lazily creates (or reuses) a connection pool for the current EMS_DB_* config. */
function getPool(config: EmsDbConfig): mysql.Pool {
  const key = `${config.host}:${config.port}:${config.database}:${config.user}:${config.password}`;
  if (!cachedPool || cachedPoolKey !== key) {
    void cachedPool?.end();
    cachedPool = mysql.createPool({
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.user,
      password: config.password,
      ssl: config.ssl ? {} : undefined,
      waitForConnections: true,
      connectionLimit: config.connectionLimit,
      multipleStatements: false,
      // Return DATE/DATETIME as plain strings — simpler and avoids timezone
      // surprises for a "format for chat display" use case.
      dateStrings: true,
    });
    cachedPoolKey = key;
  }
  return cachedPool;
}

type QueryRow = Record<string, unknown>;
type EmsQuery = { sql: string; timeout?: number };
export type EmsQueryExecutor = (query: EmsQuery, values?: unknown[]) => Promise<[QueryRow[], unknown]>;

export type EmsClientOptions = {
  /** Overrides the config read from EMS_DB_*. */
  config?: EmsDbConfig;
  /** Injectable query executor, primarily for tests. Defaults to the live connection pool. */
  queryImpl?: EmsQueryExecutor;
};

function resolveExecutor(options: EmsClientOptions): { queryImpl: EmsQueryExecutor; config: EmsDbConfig } {
  const config = options.config ?? getEmsDbConfig();
  if (!config) {
    throw new Error('EMS_DB_HOST/EMS_DB_NAME/EMS_DB_USER are not configured.');
  }
  const queryImpl =
    options.queryImpl ??
    ((query: EmsQuery, values?: unknown[]) =>
      getPool(config).query(query, values) as unknown as Promise<[QueryRow[], unknown]>);
  return { queryImpl, config };
}

const DANGEROUS_KEYWORDS = [
  'INSERT',
  'UPDATE',
  'DELETE',
  'REPLACE',
  'MERGE',
  'DROP',
  'ALTER',
  'TRUNCATE',
  'CREATE',
  'RENAME',
  'GRANT',
  'REVOKE',
  'CALL',
  'EXEC',
  'EXECUTE',
  'LOCK',
  'UNLOCK',
  'SET',
  'USE',
  'HANDLER',
  'LOAD_FILE',
  'OUTFILE',
  'DUMPFILE',
  'SHUTDOWN',
  'KILL',
  'PREPARE',
  'DEALLOCATE',
  'DO',
];
const DANGEROUS_KEYWORDS_PATTERN = new RegExp(`\\b(${DANGEROUS_KEYWORDS.join('|')})\\b`, 'i');

/**
 * Validates that `sql` is a single, plain SELECT (or WITH ... SELECT)
 * statement, and returns it with at most one trailing semicolon stripped.
 * Throws a descriptive error otherwise. This is a defense-in-depth check —
 * the row-limiting subquery wrap in searchEmsRecords is the structural
 * guarantee that only a SELECT can actually execute.
 */
export function assertSafeSelectStatement(sql: string): string {
  let trimmed = sql.trim();
  if (!trimmed) {
    throw new Error('sql must not be empty.');
  }
  trimmed = trimmed.replace(/;\s*$/, '');
  if (trimmed.includes(';')) {
    throw new Error('Only a single SQL statement is allowed (no semicolons).');
  }
  if (!/^(select|with)\b/i.test(trimmed)) {
    throw new Error('Only SELECT queries are allowed.');
  }
  const match = trimmed.match(DANGEROUS_KEYWORDS_PATTERN);
  if (match) {
    throw new Error(`Query contains a disallowed keyword: ${match[1]?.toUpperCase()}.`);
  }
  return trimmed;
}

export type SearchEmsRecordsResult = {
  rows: QueryRow[];
  hasMore: boolean;
};

export type SearchEmsRecordsOptions = EmsClientOptions & {
  limit: number;
  timeoutMs?: number;
};

/**
 * Executes a validated, read-only SELECT against the EMS database, wrapped
 * in a row-limited derived table so the result size is always bounded.
 * Requests one extra row over `limit` to detect `hasMore`, mirroring the
 * pagination convention used elsewhere in this codebase — there is no
 * offset/cursor here since the SQL is caller-composed and not necessarily
 * stable across calls; narrow the SQL instead of paging through it.
 */
export async function searchEmsRecords(
  sql: string,
  options: SearchEmsRecordsOptions,
): Promise<SearchEmsRecordsResult> {
  const { queryImpl } = resolveExecutor(options);
  const safeSql = assertSafeSelectStatement(sql);
  const wrapped = `SELECT * FROM (\n${safeSql}\n) AS ems_query_result LIMIT ?`;
  const [rows] = await queryImpl(
    { sql: wrapped, timeout: options.timeoutMs ?? DEFAULT_QUERY_TIMEOUT_MS },
    [options.limit + 1],
  );
  const hasMore = rows.length > options.limit;
  return { rows: hasMore ? rows.slice(0, options.limit) : rows, hasMore };
}

export type EmsTableSummary = {
  name: string;
  approxRowCount: number | null;
  comment: string;
};

/** Lists base tables in the configured database (name, approx row count, comment). */
export async function fetchEmsTables(options: EmsClientOptions = {}): Promise<EmsTableSummary[]> {
  const { queryImpl, config } = resolveExecutor(options);
  const [rows] = await queryImpl(
    {
      sql: `SELECT TABLE_NAME AS name, TABLE_ROWS AS approxRowCount, TABLE_COMMENT AS comment
            FROM INFORMATION_SCHEMA.TABLES
            WHERE TABLE_SCHEMA = ? AND TABLE_TYPE = 'BASE TABLE'
            ORDER BY TABLE_NAME`,
    },
    [config.database],
  );
  return rows.map((r) => ({
    name: String(r.name),
    approxRowCount: r.approxRowCount === null ? null : Number(r.approxRowCount),
    comment: String(r.comment ?? ''),
  }));
}

export type EmsColumnInfo = {
  name: string;
  type: string;
  nullable: boolean;
  key: string;
  defaultValue: string | null;
  comment: string;
};

/** Lists columns for a specific table (name, type, nullable, key, default, comment). */
export async function fetchEmsTableColumns(
  table: string,
  options: EmsClientOptions = {},
): Promise<EmsColumnInfo[]> {
  const { queryImpl, config } = resolveExecutor(options);
  const [rows] = await queryImpl(
    {
      sql: `SELECT COLUMN_NAME AS name, COLUMN_TYPE AS type, IS_NULLABLE AS nullable,
                   COLUMN_KEY AS \`key\`, COLUMN_DEFAULT AS defaultValue, COLUMN_COMMENT AS comment
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
            ORDER BY ORDINAL_POSITION`,
    },
    [config.database, table],
  );
  return rows.map((r) => ({
    name: String(r.name),
    type: String(r.type),
    nullable: r.nullable === 'YES',
    key: String(r.key ?? ''),
    defaultValue: r.defaultValue === null ? null : String(r.defaultValue),
    comment: String(r.comment ?? ''),
  }));
}
