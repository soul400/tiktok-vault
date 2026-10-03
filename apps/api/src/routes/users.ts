import { FastifyPluginAsync } from 'fastify';
import { getPrisma } from '@aep/database';

export const usersRoutes: FastifyPluginAsync = async (fastify) => {
  const prisma = getPrisma();

  // GET /api/users/:id
  fastify.get<{ Params: { id: string } }>('/users/:id', async (request, reply) => {
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { id: request.params.id },
          { userId: request.params.id },
          { uniqueId: request.params.id },
        ],
      },
      include: {
        powerUpInventory: { include: { powerUp: true } },
        watchlists: true,
      },
    });

    if (!user) return reply.status(404).send({ error: 'User not found' });

    return {
      success: true,
      data: {
        ...user,
        totalComments: Number(user.totalComments),
        totalLikes: Number(user.totalLikes),
        totalShares: Number(user.totalShares),
        totalGifts: Number(user.totalGifts),
        totalDiamonds: Number(user.totalDiamonds),
      },
    };
  });

  // GET /api/users/:id/activity
  fastify.get<{ Params: { id: string } }>('/users/:id/activity', async (request, reply) => {
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { id: request.params.id },
          { userId: request.params.id },
          { uniqueId: request.params.id },
        ],
      },
    });

    if (!user) return reply.status(404).send({ error: 'User not found' });

    const comments = await prisma.commentEvent.findMany({
      where: { userId: user.id },
      take: 20,
      orderBy: { timestampUtc: 'desc' },
      include: { session: { include: { streamer: true } } },
    });

    const gifts = await prisma.giftEvent.findMany({
      where: { userId: user.id },
      take: 20,
      orderBy: { timestampUtc: 'desc' },
      include: { session: { include: { streamer: true } } },
    });

    const powerups = await prisma.powerUpTransaction.findMany({
      where: { userId: user.id },
      take: 20,
      orderBy: { occurredAt: 'desc' },
      include: { powerUp: true, battleSession: true },
    });

    return {
      success: true,
      data: {
        comments,
        gifts: gifts.map((g) => ({ ...g, totalDiamonds: Number(g.totalDiamonds) })),
        powerups,
      },
    };
  });
};
