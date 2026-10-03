import Fastify from 'fastify';
import cors from '@fastify/cors';
import { Server as SocketIOServer } from 'socket.io';
import { getPrisma } from '@aep/database';
import { Logger } from '@aep/shared';
import { StreamerSupervisor } from '@aep/tiktok-connectors';
import { DeduplicationGate, EventStreamPublisher } from '@aep/event-pipeline';
import { WorkerService } from '@aep/worker';
import { SocketGateway } from './socket-gateway.js';
import { streamersRoutes } from './routes/streamers.js';
import { sessionsRoutes } from './routes/sessions.js';
import { battlesRoutes } from './routes/battles.js';
import { powerupsRoutes } from './routes/powerups.js';
import { watchlistRoutes } from './routes/watchlist.js';
import { usersRoutes } from './routes/users.js';
import { analyticsRoutes } from './routes/analytics.js';

// Allow BigInt to be serialized safely by JSON.stringify / Fastify
if (!(BigInt.prototype as any).toJSON) {
  (BigInt.prototype as any).toJSON = function () {
    return Number(this);
  };
}

export async function buildServer(options: { useMockConnectors?: boolean } = {}) {
  const logger = new Logger('APIServer');
  const prisma = getPrisma();

  const fastify = Fastify({
    logger: false,
  });

  await fastify.register(cors, {
    origin: true,
    credentials: true,
  });

  // Attach Socket.IO directly to Fastify underlying HTTP server
  const io = new SocketIOServer(fastify.server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  const socketGateway = new SocketGateway(io);
  const dedupGate = new DeduplicationGate(null, 300);
  const publisher = new EventStreamPublisher(null);

  // Initialize unified in-process WorkerService
  const workerService = new WorkerService();
  await workerService.start();

  // Forward Watchlist alerts from Worker to SocketGateway
  workerService.onWatchlistAlert((alert) => {
    socketGateway.emitWatchlistAlert(alert);
  });

  // Subscribe Worker to in-memory event stream
  publisher.subscribeInMemory(async (event) => {
    try {
      await workerService.processEvent(event);
    } catch (err: any) {
      logger.error(`Error processing live event in worker: ${err.message}`);
    }
  });

  // Initialize StreamerSupervisor
  const supervisor = new StreamerSupervisor(prisma, options.useMockConnectors ?? false);

  // Connect Supervisor -> Deduplicator -> Publisher -> SocketGateway & Worker
  supervisor.setDispatcher(async (event) => {
    // 1. Deduplication check
    const isUnique = await dedupGate.isUnique(event);
    if (!isUnique) {
      return; // Drop duplicate
    }

    // 2. Real-time WebSocket emission (throttled & prioritized)
    socketGateway.dispatchLiveEvent(event);

    // 3. Publish to worker / event bus
    await publisher.publish(event);
  });

  // Forward real-time health telemetry from TikTok live connector to Socket.IO gateway
  supervisor.setHealthDispatcher((telemetry) => {
    socketGateway.broadcastTelemetry(telemetry);
  });

  // Register API Routes
  await fastify.register(streamersRoutes(supervisor), { prefix: '/api' });
  await fastify.register(sessionsRoutes, { prefix: '/api' });
  await fastify.register(battlesRoutes, { prefix: '/api' });
  await fastify.register(powerupsRoutes, { prefix: '/api' });
  await fastify.register(watchlistRoutes, { prefix: '/api' });
  await fastify.register(usersRoutes, { prefix: '/api' });
  await fastify.register(analyticsRoutes, { prefix: '/api' });

  fastify.get('/health', async () => ({
    status: 'HEALTHY',
    timeUtc: new Date().toISOString(),
    dedupDuplicatesDropped: dedupGate.duplicatesDetected,
    monitoredStreamers: supervisor.getAllMonitoredStreamers().length,
  }));

  // Auto-resume existing tracked streamers
  try {
    const existingStreamers = await prisma.trackedStreamer.findMany({
      where: { monitoringEnabled: true },
    });
    for (const streamer of existingStreamers) {
      supervisor.startMonitoring(streamer.username).catch((err) => {
        logger.warn(`Failed to auto-resume @${streamer.username}: ${err.message}`);
      });
    }
  } catch (err: any) {
    logger.error(`Error loading tracked streamers: ${err.message}`);
  }

  return {
    fastify,
    io,
    supervisor,
    socketGateway,
    publisher,
    dedupGate,
    workerService,
  };
}
