import { FastifyPluginAsync } from 'fastify';
import { getPrisma } from '@aep/database';

export const watchlistRoutes: FastifyPluginAsync = async (fastify) => {
  const prisma = getPrisma();

  // GET /api/watchlist
  fastify.get('/watchlist', async () => {
    const list = await prisma.watchlist.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          include: {
            powerUpInventory: { include: { powerUp: true } },
          },
        },
      },
    });

    return {
      success: true,
      data: list.map((item) => ({
        ...item,
        user: {
          ...item.user,
          totalComments: Number(item.user.totalComments),
          totalLikes: Number(item.user.totalLikes),
          totalShares: Number(item.user.totalShares),
          totalGifts: Number(item.user.totalGifts),
          totalDiamonds: Number(item.user.totalDiamonds),
        },
      })),
    };
  });

  // POST /api/watchlist
  fastify.post<{
    Body: {
      username: string;
      note?: string;
      notifyComments?: boolean;
      notifyLikes?: boolean;
      notifyShares?: boolean;
      notifyGifts?: boolean;
      notifyDiamonds?: boolean;
      notifyBattles?: boolean;
      notifyPowerups?: boolean;
      notifyMvp?: boolean;
    };
  }>('/watchlist', async (request, reply) => {
    const {
      username,
      note,
      notifyComments = true,
      notifyLikes = true,
      notifyShares = true,
      notifyGifts = true,
      notifyDiamonds = true,
      notifyBattles = true,
      notifyPowerups = true,
      notifyMvp = true,
    } = request.body || {};

    if (!username) {
      return reply.status(400).send({ error: 'Username is required' });
    }

    const clean = username.replace(/^@/, '').trim();

    // Check if user already exists in DB by uniqueId or userId
    let user = await prisma.user.findFirst({
      where: {
        OR: [
          { uniqueId: { equals: clean, mode: 'insensitive' } },
          { userId: clean },
        ],
      },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          userId: `u_${clean}`,
          uniqueId: clean,
          nickname: clean,
        },
      });
    }

    // Check if user is already monitored in watchlist
    const existingEntry = await prisma.watchlist.findFirst({
      where: { userId: user.id },
      include: { user: true },
    });

    if (existingEntry) {
      return { success: true, data: existingEntry };
    }

    const entry = await prisma.watchlist.create({
      data: {
        userId: user.id,
        note,
        notifyComments,
        notifyLikes,
        notifyShares,
        notifyGifts,
        notifyDiamonds,
        notifyBattles,
        notifyPowerups,
        notifyMvp,
      },
      include: { user: true },
    });

    if (typeof (fastify as any).refreshWatchlistCache === 'function') {
      await (fastify as any).refreshWatchlistCache();
    }

    return { success: true, data: entry };
  });

  // DELETE /api/watchlist/:id
  fastify.delete<{ Params: { id: string } }>('/watchlist/:id', async (request) => {
    await prisma.watchlist.delete({ where: { id: request.params.id } });
    if (typeof (fastify as any).refreshWatchlistCache === 'function') {
      await (fastify as any).refreshWatchlistCache();
    }
    return { success: true, message: 'Removed from watchlist' };
  });
};
