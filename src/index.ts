import { getServerConfig } from './config.js';
import { closeEmsPool } from './integrations/ems/client.js';
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
  // The EMS MySQL pool holds open sockets that survive server.stop(); close it
  // so the process can exit cleanly instead of being killed by the timeout.
  await closeEmsPool().catch((error: unknown) => {
    console.error('Failed to close the EMS connection pool:', error);
  });
  process.exit(0);
};
process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
