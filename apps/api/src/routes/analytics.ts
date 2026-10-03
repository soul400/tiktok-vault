import { FastifyPluginAsync } from 'fastify';
import { getPrisma } from '@aep/database';

export const analyticsRoutes: FastifyPluginAsync = async (fastify) => {
  const prisma = getPrisma();

  // GET /api/analytics/overview
  fastify.get('/analytics/overview', async () => {
    const totalStreamers = await prisma.trackedStreamer.count();
    const liveStreamers = await prisma.trackedStreamer.count({ where: { status: 'LIVE' } });
    const activeBattles = await prisma.battleSession.count({ where: { status: 'IN_PROGRESS' } });
    const totalSessions = await prisma.liveSession.count();
    const totalUsers = await prisma.user.count();

    // Top Supporters
    const topSupporters = await prisma.user.findMany({
      orderBy: { totalDiamonds: 'desc' },
      take: 10,
      include: {
        powerUpInventory: { include: { powerUp: true } },
      },
    });

    // Top Likers
    const topLikers = await prisma.user.findMany({
      orderBy: { totalLikes: 'desc' },
      take: 10,
    });

    // Top Commenters
    const topCommenters = await prisma.user.findMany({
      orderBy: { totalComments: 'desc' },
      take: 10,
    });

    return {
      success: true,
      data: {
        totalStreamers,
        liveStreamers,
        activeBattles,
        totalSessions,
        totalUsers,
        topSupporters: topSupporters.map((u) => ({
          ...u,
          totalDiamonds: Number(u.totalDiamonds),
          totalLikes: Number(u.totalLikes),
          totalComments: Number(u.totalComments),
          totalGifts: Number(u.totalGifts),
        })),
        topLikers: topLikers.map((u) => ({
          ...u,
          totalLikes: Number(u.totalLikes),
        })),
        topCommenters: topCommenters.map((u) => ({
          ...u,
          totalComments: Number(u.totalComments),
        })),
      },
    };
  });

  // GET /api/export/:type (csv or json)
  fastify.get<{ Params: { type: string }; Querystring: { entity: string } }>(
    '/export/:type',
    async (request, reply) => {
      const { type } = request.params;
      const { entity = 'sessions' } = request.query;

      let records: any[] = [];
      if (entity === 'sessions') {
        records = await prisma.liveSession.findMany({
          take: 1000,
          include: { streamer: true },
          orderBy: { startedAtUtc: 'desc' },
        });
      } else if (entity === 'users') {
        records = await prisma.user.findMany({
          take: 1000,
          orderBy: { totalDiamonds: 'desc' },
        });
      } else if (entity === 'gifts') {
        records = await prisma.giftEvent.findMany({
          take: 1000,
          include: { user: true },
          orderBy: { timestampUtc: 'desc' },
        });
      } else if (entity === 'battles') {
        records = await prisma.battleSession.findMany({
          take: 500,
          orderBy: { startedAt: 'desc' },
        });
      } else if (entity === 'powerups') {
        records = await prisma.powerUpTransaction.findMany({
          take: 1000,
          include: { user: true, powerUp: true },
          orderBy: { occurredAt: 'desc' },
        });
      }

      if (type === 'json') {
        return reply.header('Content-Disposition', `attachment; filename="${entity}-export.json"`).send(records);
      }

      // Convert to CSV
      if (records.length === 0) {
        return reply.header('Content-Type', 'text/csv').send('');
      }

      const keys = Object.keys(records[0]).filter((k) => typeof records[0][k] !== 'object');
      const csvHeader = keys.join(',');
      const csvRows = records.map((r) => keys.map((k) => JSON.stringify(r[k] ?? '')).join(','));
      const csvContent = [csvHeader, ...csvRows].join('\n');

      return reply
        .header('Content-Type', 'text/csv')
        .header('Content-Disposition', `attachment; filename="${entity}-export.csv"`)
        .send(csvContent);
    }
  );
};
