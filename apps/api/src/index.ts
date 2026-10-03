import { buildServer } from './server.js';
import { WorkerService } from '@aep/worker';
import { Logger } from '@aep/shared';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from app dir and repo root
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config();

const logger = new Logger('APIBootstrap');
const PORT = Number(process.env.PORT || 4000);

async function main() {
  const { fastify, publisher, socketGateway, workerService } = await buildServer({
    useMockConnectors: process.env.USE_MOCK_CONNECTORS === 'true',
  });

  // Expose cache refresh to API routes
  (fastify as any).refreshWatchlistCache = () => workerService.refreshWatchlistCache();

  await fastify.ready();
  await fastify.listen({ port: PORT, host: '0.0.0.0' });
  logger.info(`🚀 AEP API & Socket.IO Gateway listening on http://localhost:${PORT}`);
}

main().catch((err) => {
  logger.error(`Fatal server error: ${err.message}`, { stack: err.stack });
  process.exit(1);
});
