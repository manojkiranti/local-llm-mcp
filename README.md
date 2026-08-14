# Local LLM MCP server

A trusted-backend MCP server built with Node.js and FastMCP. It exposes tools over the MCP **Streamable HTTP** transport at `http://127.0.0.1:3333/mcp` and authenticates every MCP request with one shared bearer token.

There is no OAuth, user login, or browser connect flow. Keep this service on localhost or a private network that only the gateway can reach: possession of the shared token grants access to every registered tool.

## Run locally

Requires Node.js 22 or later.

```bash
npm install
cp .env.example .env
# Replace MCP_SERVICE_TOKEN in .env with a long random secret.
npm start
```

For development with file watching, use `npm run dev`. For a compiled production run, use `npm run build` followed by `npm run start:prod`.

The server defaults to `HOST=127.0.0.1`, `PORT=3333`, and the fixed endpoint `/mcp`. Bind to a private interface only when the gateway runs on another machine.

## Tools

All current tools are named so the gateway exposes them in its default `read_only` mode:

- `get_server_time` — returns the current UTC time as an ISO string.
- `get_echo` — returns a supplied message to verify tool arguments and results.
- `list_examples` — returns sample calls/tools and supports an optional `limit`.
- `list_hrms_employees` — lists active employees a page at a time, with optional `department`, `province`, and `branch` filters and `limit`/`offset` paging (`hasMore`/`nextOffset` in the response). When `HRMS_BASE_URL` is set it fetches the live HRMS active-employee feed; otherwise it returns sample data shaped like that feed (`source` in the result is `hrms` or `sample`).
- `get_hrms_employee_details` — looks up employees by `employeeNo`, `fullName`, `department`, `province`, `branch`, or free-text `search`, with the same paging as above. Set `full=true` (or pass `employeeNo`) for every HRMS field instead of the compact summary.
- `get_hrms_employee_tasks` — returns pending task/approval counts (attendance, leave, travel, transfer, overtime, resignation, loans, allowances) for one employee, given `employeeId`. When `HRMS_BASE_URL` is set it fetches the live HRMS tasks feed; otherwise it returns sample data with all-zero counts.
- `list_hrms_departments` — lists departments a page at a time, with optional `name` and `code` filters and `limit`/`offset` paging. Blocked (disabled) departments are excluded unless `includeBlocked=true`. When `HRMS_BASE_URL` is set it fetches the live HRMS departments feed; otherwise it returns sample data.
- `list_izone_lists` — lists SharePoint lists/document libraries on the iZone intranet site (title, item count, whether it's a document library), with optional `search` and `limit`/`offset` paging. Use this to find exact list/library titles for the two tools below.
- `list_izone_list_items` — gets rows from a SharePoint list by exact (case-sensitive) `listTitle`, with optional `select`/`filter` (genuine server-side OData). Paginated via an opaque `cursor`/`nextCursor` — this endpoint doesn't support offset paging.
- `list_izone_documents` — lists the folders and files directly inside a document library `folder` path (not recursive), with optional `search` and `limit`/`offset` paging. Defaults to the "Shared Documents" library root.
- `search_izone_country_circulars` — searches the Country Circular index (the data behind the site's "Search Country Circular" page) by free text, `status`, `category`, or `originator`, with `limit`/`offset` paging. Each result includes a `viewUrl` to open the document (requires a logged-in browser session, same as the site's own "View" link). Uses the live feed when `IZONE_COUNTRY_CIRCULAR_URL` is set, otherwise sample data.

The first three iZone tools use the live site when `IZONE_BASE_URL` is set, otherwise sample data.
- `list_ems_tables` — lists tables in the EMS (Expenses Management System) MySQL database (name, approximate row count, comment), or pass `table` for that table's columns. Call this before `search_ems_records` to learn real table/column names.
- `search_ems_records` — runs a caller-composed, read-only SQL `SELECT` against the EMS database and returns matching rows, for answering natural-language questions about expenses. Only a single `SELECT`/`WITH` statement is accepted; writes, DDL, and multiple statements are rejected both by keyword check and structurally (the query is executed wrapped in a row-limited derived table, so non-SELECT SQL can't parse inside it). `limit` (max 200) bounds rows returned; `hasMore` signals to narrow the SQL rather than just raising it.

Both EMS tools use the live database when `EMS_DB_HOST`/`EMS_DB_NAME`/`EMS_DB_USER` are set, otherwise sample data (`search_ems_records`'s sample response ignores the `sql` given).

`X-User-Email` is accepted when supplied and stored in the FastMCP session as `userEmail`. It is optional and is not currently used to authorize or scope tools.

## Project structure

```text
src/
├── index.ts                    # Process startup and shutdown
├── config.ts                   # Environment parsing and validation
├── server.ts                   # FastMCP server construction
├── auth/
│   └── service-token.ts        # Shared bearer-token authentication
├── integrations/
│   ├── hrms/
│   │   └── client.ts           # Live HRMS active-employee feed client
│   ├── izone/
│   │   ├── client.ts            # Live iZone (on-prem SharePoint REST API) client
│   │   └── circulars-client.ts  # Live Country Circular index client (separate internal API)
│   └── ems/
│       └── client.ts            # EMS MySQL client: read-only query execution + schema discovery
└── tools/
    ├── index.ts                # Central tool-group registration
    ├── basic/
    │   ├── index.ts
    │   ├── get-server-time.ts
    │   ├── get-echo.ts
    │   └── list-examples.ts
    ├── hrms/
    │   ├── index.ts
    │   ├── list-employees.ts     # list_hrms_employees: MCP schema and execution adapter
    │   ├── employee-details.ts   # get_hrms_employee_details: MCP schema and execution adapter
    │   ├── employee-tasks.ts     # get_hrms_employee_tasks: MCP schema and execution adapter
    │   ├── list-departments.ts   # list_hrms_departments: MCP schema and execution adapter
    │   ├── query.ts               # Fetch + in-memory filter/paginate, shared by the list/details tools
    │   ├── filter.ts              # Shared in-memory filtering
    │   ├── project.ts             # Compact field summary projection
    │   ├── sample-data.ts         # Mock data (fallback when HRMS_BASE_URL unset)
    │   └── types.ts
    └── izone/
        ├── index.ts
        ├── list-lists.ts        # list_izone_lists: MCP schema and execution adapter
        ├── list-items.ts        # list_izone_list_items: MCP schema and execution adapter
        ├── list-documents.ts    # list_izone_documents: MCP schema and execution adapter
        ├── search-country-circulars.ts  # search_izone_country_circulars: MCP schema and execution adapter
        ├── filter.ts             # Shared in-memory filtering/paging
        ├── sample-data.ts        # Mock data (fallback when IZONE_BASE_URL/IZONE_COUNTRY_CIRCULAR_URL unset)
        └── types.ts
    └── ems/
        ├── index.ts
        ├── list-tables.ts        # list_ems_tables: MCP schema and execution adapter
        ├── search-records.ts     # search_ems_records: MCP schema and execution adapter
        └── sample-data.ts        # Mock schema/data (fallback when EMS_DB_* unset)
test/
├── index.ts                    # Test entrypoint
├── auth.test.ts
├── config.test.ts
├── hrms.test.ts
├── hrms-client.test.ts
├── hrms-query.test.ts
├── izone.test.ts
├── izone-client.test.ts
├── izone-circulars-client.test.ts
├── ems.test.ts
└── ems-client.test.ts
```

Each domain owns its tools and exports one registration function from its `index.ts`. The central `src/tools/index.ts` is the only place that connects tool groups to the server.

The HRMS integration lives in `src/integrations/hrms/client.ts`. `fetchActiveEmployees` fetches the active-employee feed (`GET {HRMS_BASE_URL}`, e.g. `.../api/v1/auth/employees/active-employee`) and returns its `value` array; the feed returns every active employee on each request — it does not support server-side `$filter`/`$top`/`$skip` — so `query.ts` fetches the full list and the list/details tools filter and paginate it in memory via `filterEmployees`, the same path used for the sample-data fallback so both behave identically. `fetchEmployeeTasks` fetches `GET {origin of HRMS_BASE_URL}/api/v1/auth/employees/tasks?employee_id=...` — a separate endpoint on the same host that requires `employee_id` and does filter server-side. `fetchDepartments` fetches `GET {origin of HRMS_BASE_URL}/api/v1/auth/hr/departments`, which behaves like the active-employee feed (ignores server-side filtering, so `list-departments.ts` filters/paginates it in memory via `filterDepartments`). The sample data mirrors the feeds' field names, so no field mapping is needed. The host is network-trusted on some deployments (no auth header); where it requires Windows auth, set `HRMS_NTLM_USERNAME`/`HRMS_NTLM_PASSWORD` (and optionally `HRMS_NTLM_DOMAIN`/`HRMS_NTLM_WORKSTATION`) and the client authenticates via NTLM automatically — keep HTTP handling in the integration client and the MCP parameter schema in the tool files.

The iZone integration lives in `src/integrations/izone/client.ts`, talking to a local on-prem SharePoint site's own REST API (`GET {IZONE_BASE_URL}_api/web/...`) over NTLM — every request 401s with `WWW-Authenticate: NTLM` without it, so `IZONE_NTLM_USERNAME`/`IZONE_NTLM_PASSWORD` (and optionally `IZONE_NTLM_DOMAIN`/`IZONE_NTLM_WORKSTATION`) are required whenever `IZONE_BASE_URL` is set, unlike the HRMS NTLM fallback. Unlike the HRMS feeds, this REST API is genuine OData: `$select`/`$filter`/`$top` are honored server-side. `fetchIzoneListItems` pages via a `$skiptoken` cursor the server returns as `d.__next` (`$skip` has no effect there, so it isn't used) — `list-items.ts` passes that cursor straight through to the caller as `nextCursor` rather than reimplementing offset paging. `fetchIzoneLists` and `fetchIzoneFolderContents` hit collections that don't return a paging cursor at all, so `list-lists.ts`/`list-documents.ts` fetch a bounded window and filter/paginate it in memory via `filter.ts`, the same pattern the HRMS tools use. The client strips SharePoint's `__metadata` bookkeeping field from every result before it reaches a tool.

`search_izone_country_circulars` does not use the SharePoint REST API at all. The "Search Country Circular.aspx" page's own inline JavaScript was read to find what it actually calls: a separate internal API (`GET {IZONE_COUNTRY_CIRCULAR_URL}`, no auth, not OData) that always returns the full ~12k-row circular index as a plain JSON array; the page's DataTables widget does search/paging client-side in the browser. `circulars-client.ts` mirrors that — `fetchIzoneCountryCirculars` fetches the whole index and the tool filters/paginates it in memory via `filterCountryCirculars`, same pattern as the other in-memory-paginated tools. Each result's `viewUrl` is built the same way the page itself builds its "View" link (`http://izonedoc.nicasiabank.com/view/{encoded file name}`); opening it requires an authenticated browser session, so it will 401 from a bare HTTP client.

The EMS integration (`src/integrations/ems/client.ts`) is different from the others: it's a direct MySQL connection (via `mysql2`), not an HTTP API, and `search_ems_records` lets the calling LLM execute SQL it composes itself from a natural-language question rather than the tool taking structured filter parameters. Because of that, safety is enforced in the client, not just the tool schema: `assertSafeSelectStatement` rejects anything that isn't a single `SELECT`/`WITH` statement (no semicolons, no write/DDL/admin keywords), and `searchEmsRecords` then executes it wrapped in a row-limited derived table (`SELECT * FROM (<query>) AS ems_query_result LIMIT ?`) — a structural guarantee, since MySQL can't parse non-SELECT SQL inside that `FROM` clause even if the keyword check missed something. `list_ems_tables` reads `INFORMATION_SCHEMA` with parameterized queries built by the client itself (never user-supplied SQL) so the calling LLM can learn real table/column names before composing a query. A read-only MySQL user is recommended for `EMS_DB_USER` as defense in depth, though the tool enforces read-only regardless.

For another domain, create `src/tools/<domain>/`, export `register<Domain>Tools`, and add that group to `src/tools/index.ts`. Use a read-style tool name (`get_`, `list_`, `search_`, and similar) when it should remain visible under the gateway's default `read_only` policy.

## Connect the local LLM gateway

In `/home/manoj/newlaptop/projects/python/local-ai-model-gateway/.env`, set:

```dotenv
MCP_SERVER_URL=http://localhost:3333/mcp
MCP_AUTH_TOKEN=<the same value as this server's MCP_SERVICE_TOKEN>
MCP_TOOL_MODE=read_only
```

For write tools added later, switch to `MCP_TOOL_MODE=allowlist` and set `MCP_TOOL_ALLOWLIST` to exact comma-separated tool names, or deliberately use `all`. Restart the gateway after changing its environment.

With a valid gateway JWT, `GET /v1/tools` should list these tools with `backend` set to `mcp`. `POST /v1/agent` can then select and call them.

## Test

```bash
npm test
npm run typecheck
```

For a manual protocol test, start the server and launch MCP Inspector:

```bash
npx @modelcontextprotocol/inspector http://localhost:3333/mcp
```

Configure the Inspector connection to send `Authorization: Bearer <the value of MCP_SERVICE_TOKEN>`. Missing or incorrect bearer credentials receive HTTP 401.
