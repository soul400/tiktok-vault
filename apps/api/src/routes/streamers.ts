import { FastifyPluginAsync } from 'fastify';
import { getPrisma } from '@aep/database';
import { StreamerSupervisor } from '@aep/tiktok-connectors';

export const streamersRoutes = (supervisor: StreamerSupervisor): FastifyPluginAsync => {
  return async (fastify) => {
    const prisma = getPrisma();

    // GET /api/streamers
    fastify.get('/streamers', async () => {
      const streamers = await prisma.trackedStreamer.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
          sessions: {
            take: 1,
            orderBy: { startedAtUtc: 'desc' },
          },
        },
      });

      return {
        success: true,
        data: streamers.map((s) => {
          const connector = supervisor.getConnector(s.id);
          return {
            ...s,
            liveSession: s.sessions[0] || null,
            telemetry: connector ? connector.telemetry : null,
          };
        }),
      };
    });

    // POST /api/streamers
    fastify.post<{ Body: { username: string } }>('/streamers', async (request, reply) => {
      const { username } = request.body || {};
      if (!username) {
        return reply.status(400).send({ error: 'Username is required' });
      }

      const clean = username.replace(/^@/, '').trim();
      const streamer = await supervisor.startMonitoring(clean);
      return { success: true, data: streamer };
    });

    // DELETE /api/streamers/:id
    fastify.delete<{ Params: { id: string } }>('/streamers/:id', async (request) => {
      await supervisor.stopMonitoring(request.params.id);
      await prisma.trackedStreamer.delete({ where: { id: request.params.id } });
      return { success: true, message: 'Streamer removed' };
    });

    // GET /api/streamers/:id/status
    fastify.get<{ Params: { id: string } }>('/streamers/:id/status', async (request, reply) => {
      const streamer = await prisma.trackedStreamer.findUnique({
        where: { id: request.params.id },
      });
      if (!streamer) return reply.status(404).send({ error: 'Not found' });

      const connector = supervisor.getConnector(streamer.id);
      return {
        success: true,
        data: {
          streamer,
          telemetry: connector?.telemetry || null,
        },
      };
    });
  };
};
