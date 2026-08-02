import { getServerConfig } from './config.js';
import { createServer } from './server.js';

const config = getServerConfig();
const server = createServer(config.serviceToken);
await server.start({
  transportType: 'httpStream',
  httpStream: { host: config.host, port: config.port, endpoint: config.endpoint },
});
console.log(
  `Local LLM MCP server listening on http://${config.host}:${config.port}${config.endpoint}`,
);

const shutdown = async (signal: string) => {
  console.log(`Received ${signal}; stopping MCP server.`);
  await server.stop();
  process.exit(0);
};
process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
