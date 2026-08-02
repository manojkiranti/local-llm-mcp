export type ServerConfig = {
  serviceToken: string;
  host: string;
  port: number;
  endpoint: '/mcp';
};

export function getServerConfig(env: NodeJS.ProcessEnv = process.env): ServerConfig {
  const serviceToken = env.MCP_SERVICE_TOKEN?.trim() ?? '';
  if (!serviceToken) {
    throw new Error('MCP_SERVICE_TOKEN is required. Set it in .env before starting the server.');
  }

  const port = Number(env.PORT ?? 3333);
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error(`PORT must be an integer from 1 to 65535; received ${env.PORT}.`);
  }

  return {
    serviceToken,
    host: env.HOST?.trim() || '127.0.0.1',
    port,
    endpoint: '/mcp',
  };
}
