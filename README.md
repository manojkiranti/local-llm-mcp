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
- `list_hrms_employees` — returns sample employees and supports optional department and employment-status filters. Its isolated mock data source can later be replaced with the real HRMS API.

`X-User-Email` is accepted when supplied and stored in the FastMCP session as `userEmail`. It is optional and is not currently used to authorize or scope tools.

## Project structure

```text
src/
├── index.ts                    # Process startup and shutdown
├── config.ts                   # Environment parsing and validation
├── server.ts                   # FastMCP server construction
├── auth/
│   └── service-token.ts        # Shared bearer-token authentication
└── tools/
    ├── index.ts                # Central tool-group registration
    ├── basic/
    │   ├── index.ts
    │   ├── get-server-time.ts
    │   ├── get-echo.ts
    │   └── list-examples.ts
    └── hrms/
        ├── index.ts
        ├── list-employees.ts   # MCP schema and execution adapter
        ├── sample-data.ts      # Temporary mock data and filtering
        └── types.ts
test/
├── index.ts                    # Test entrypoint
├── auth.test.ts
├── config.test.ts
└── hrms.test.ts
```

Each domain owns its tools and exports one registration function from its `index.ts`. The central `src/tools/index.ts` is the only place that connects tool groups to the server.

When the real HRMS API is available, add an `src/integrations/hrms/` client and replace the call to `listSampleEmployees` inside `list-employees.ts`. Keep API credentials in environment variables, HTTP handling in the integration client, and the MCP parameter schema in the tool file.

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
