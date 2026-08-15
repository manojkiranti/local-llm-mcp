# AGENTS.md — Local LLM MCP Server

Orientation file for AI coding agents (Claude Code, Codex, etc.). Read this first, then use `README.md` for setup and gateway connection details.

## Purpose

This repository is a standalone MCP server for the local LLM gateway. It exposes trusted backend tools over MCP Streamable HTTP and authenticates requests with one shared service token.

There is no OAuth, user login, Google login, or per-user browser connection flow. Keep the service on localhost or a private network: anyone with the shared token can call every registered tool.

## Stack

- **Runtime:** Node.js 22+
- **Language:** TypeScript 6 in strict mode
- **Modules:** native ESM (`"type": "module"`) with NodeNext resolution
- **MCP framework:** FastMCP 4
- **Validation:** Zod 4
- **Transport:** Streamable HTTP (`httpStream`) at the fixed `/mcp` endpoint
- **Authentication:** shared bearer token from `MCP_SERVICE_TOKEN`
- **Build output:** `dist/`
- **Tests:** Node test runner through `tsx`

## Commands

```bash
npm install              # install dependencies
npm run dev              # watch-mode server using .env
npm start                # run TypeScript server using .env
npm run build            # compile src/ to dist/
npm run start:prod       # run compiled dist/index.js using .env
npm run typecheck        # TypeScript check without emitting files
npm test                 # run all tests through test/index.ts
```

For a manual MCP protocol check, start the server and run:

```bash
npx @modelcontextprotocol/inspector http://localhost:3333/mcp
```

Configure Inspector with `Authorization: Bearer <MCP_SERVICE_TOKEN>`. Do not commit `.env` or real tokens.

## ESM import convention

Source imports use `.js` extensions even though the source files are `.ts`:

```ts
import { getServerConfig } from './config.js';
```

This is required by the NodeNext/ESM build. Do not change imports to extensionless paths or `.ts` extensions.

## Folder map

```text
src/
├── index.ts                    process startup and graceful shutdown
├── config.ts                   environment parsing and validation
├── server.ts                   FastMCP construction
├── auth/
│   └── service-token.ts        bearer-token authentication and session context
├── integrations/
│   └── hrms/
│       └── client.ts           live HRMS OData HTTP client
└── tools/
    ├── index.ts                central registration for all tool domains
    ├── basic/                  basic diagnostic/example tools
    └── hrms/                   HRMS schema, filtering, and sample fallback
test/
├── index.ts                    imports every test module
├── auth.test.ts
├── config.test.ts
├── hrms.test.ts
└── hrms-client.test.ts
```

Each tool domain belongs under `src/tools/<domain>/` and exports one `register<Domain>Tools` function from its `index.ts`. Add that domain registration only in `src/tools/index.ts`. Put external HTTP/API behavior under `src/integrations/<domain>/` so MCP schemas and integration clients remain separate.

## Hard rules

1. **Preserve the gateway contract** — use FastMCP Streamable HTTP with `transportType: 'httpStream'` and the fixed endpoint `/mcp`. Defaults are `127.0.0.1:3333`; only the host and port are configurable.
2. **Keep authentication backend-to-backend** — validate `Authorization: Bearer <token>` against `MCP_SERVICE_TOKEN`. Do not add OAuth, login routes, browser connection flows, or per-user tokens unless the user explicitly changes the architecture.
3. **Treat the service token as full access** — never log it, return it from a tool, bake it into an image, or commit it. Keep timing-safe token comparison in `src/auth/service-token.ts`.
4. **Do not use user email as authorization** — `X-User-Email` may populate `session.userEmail`, but it is optional metadata and does not currently scope tool access.
5. **Keep read tools compatible with gateway policy** — the gateway uses `MCP_TOOL_MODE=allowlist` with exact names in `MCP_TOOL_ALLOWLIST`. Registering a tool does not expose it; add its exact name to that list too, in `docker-compose.yml` and `README.md`. Still name read operations `get_`, `list_`, or `search_`, and never disguise a mutation with a read-style name — the allowlist is the enforcement, the naming convention is the signal to humans.
6. **Register tools centrally** — a tool is not available until its domain registration function is called from `src/tools/index.ts`. Keep tool names unique across domains.
7. **Validate every tool input** — define bounded Zod schemas with useful descriptions. Avoid unbounded list sizes, ambiguous optional values, and unchecked casts.
8. **Separate tools from integrations** — tool files own MCP names, descriptions, schemas, and response adaptation. Integration clients own URLs, headers, timeouts, fetch behavior, and upstream response handling.
9. **Centralize server configuration** — parse and validate listener/auth settings in `src/config.ts`. If a new environment variable is introduced, document it in `.env.example` and `README.md` without adding a real secret.
10. **Preserve live-versus-sample truthfulness** — `list_hrms_employees` uses the live feed only when `HRMS_BASE_URL` is set. Its result must continue to identify `source` as `hrms` or `sample`; never present fallback data as live HRMS data.
11. **Keep HRMS behavior aligned across sources** — apply the shared in-memory filters to live and sample employee arrays. Preserve the upstream HRMS field names unless the external contract is deliberately migrated.
12. **Always add or update tests** — every behavior-changing code change must include corresponding automated tests. Cover the main success path and relevant failure or boundary cases. Add new test modules under `test/` and import them from `test/index.ts`. Do not consider implementation complete until `npm test`, `npm run typecheck`, and `npm run build` pass.

## Current tools

- `get_server_time` — returns current UTC time.
- `get_echo` — echoes a supplied message for argument/result checks.
- `list_examples` — lists sample calls/tools with an optional limit.
- `list_hrms_employees` — filters employees by department, province, and branch; uses live HRMS when configured and sample data otherwise.

Tool handlers currently return formatted JSON strings. Preserve a tool's established result shape when extending it; gateway and agent behavior may depend on its keys.

## HRMS integration

`src/integrations/hrms/client.ts` fetches `GET {HRMS_BASE_URL}`, expects an OData-style `{ value: Employee[] }` response, and applies a 10-second timeout. The current private endpoint is network-trusted, so the client sends no authorization header.

If HRMS later requires credentials, add explicit environment variables and construct headers inside the integration client. Do not reuse `MCP_SERVICE_TOKEN` for upstream systems and do not put HTTP concerns in `src/tools/hrms/list-employees.ts`.

When live HRMS is configured but its request fails, the tool reports `source: 'hrms'` with an error and an empty result. It must not silently fall back to sample employees, because that could make mock data appear live.

## Docker and gateway contract

The production image builds TypeScript in a Node 22 Alpine build stage, installs production-only dependencies separately, and runs as the non-root `node` user. Supply `MCP_SERVICE_TOKEN` at runtime.

The compose stack connects the gateway to this server over the private Docker network:

```dotenv
MCP_SERVER_URL=http://mcp:3333/mcp
MCP_AUTH_TOKEN=<same value as MCP_SERVICE_TOKEN>
MCP_TOOL_MODE=allowlist
MCP_TOOL_ALLOWLIST=<exact comma-separated tool names; see docker-compose.yml>
```

For host-based development, the equivalent server URL is `http://localhost:3333/mcp`. Changing the MCP server token requires the gateway token to change to the same value, followed by a restart.

The allowlist is matched by exact set membership, so a typo silently hides a tool rather than erroring. After changing it, restart the gateway and confirm the exposed set via `GET /mcp/status`.

Never widen this policy as a side effect of adding a tool. `read_only` is weaker than it looks — it infers exposure from the tool name, so a new `get_`/`list_`/`search_` tool goes live with no decision. `all` enables write tools and requires a deliberate choice.

## Checklist: adding a tool domain

1. Create `src/tools/<domain>/` with the tool implementation and an `index.ts` registration function.
2. Put remote API access in `src/integrations/<domain>/` rather than in the MCP adapter.
3. Define a bounded Zod input schema and a clear tool description.
4. Choose a truthful read or write name that matches gateway policy.
5. Register the domain in `src/tools/index.ts`.
6. Add each new tool's exact name to `MCP_TOOL_ALLOWLIST` in `docker-compose.yml` and `README.md`, or the gateway will not expose it.
7. Add any environment variables to config as appropriate, `.env.example`, and `README.md`.
8. Add tests and import the test module from `test/index.ts`.
9. Run `npm test`, `npm run typecheck`, and `npm run build`.

## Verification boundaries

- Unit tests and typechecking do not prove that a live HRMS endpoint, gateway, Ollama model, Docker stack, or external network is reachable.
- Do not claim a live integration works unless it was exercised with the required services and credentials.
- A manual MCP check must cover authenticated discovery/calling and rejection of missing or invalid bearer tokens when authentication changes.

## Further reading

- `README.md` — canonical setup, tool list, architecture, gateway connection, and manual testing
- `.env.example` — supported local environment variables
- `src/config.ts` — listener and service-token configuration
- `src/auth/service-token.ts` — authentication contract
- `src/tools/index.ts` — registered domains
- `docker-compose.yml` — full local gateway/MCP/Postgres wiring
- `Dockerfile` — production image behavior
