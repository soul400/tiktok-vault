import { FastifyPluginAsync } from 'fastify';
import { getPrisma } from '@aep/database';

export const sessionsRoutes: FastifyPluginAsync = async (fastify) => {
  const prisma = getPrisma();

  // GET /api/sessions
  fastify.get('/sessions', async (request) => {
    const { streamerId, limit = 20 } = request.query as any;
    const sessions = await prisma.liveSession.findMany({
      where: streamerId ? { streamerId } : undefined,
      orderBy: { startedAtUtc: 'desc' },
      take: Number(limit),
      include: {
        streamer: true,
      },
    });

    return {
      success: true,
      data: sessions.map((s) => ({
        ...s,
        totalComments: Number(s.totalComments),
        totalLikes: Number(s.totalLikes),
        totalShares: Number(s.totalShares),
        totalGifts: Number(s.totalGifts),
        totalDiamonds: Number(s.totalDiamonds),
      })),
    };
  });

  // GET /api/sessions/:id
  fastify.get<{ Params: { id: string } }>('/sessions/:id', async (request, reply) => {
    const session = await prisma.liveSession.findUnique({
      where: { id: request.params.id },
      include: {
        streamer: true,
        battles: true,
      },
    });
    if (!session) return reply.status(404).send({ error: 'Session not found' });

    return {
      success: true,
      data: {
        ...session,
        totalComments: Number(session.totalComments),
        totalLikes: Number(session.totalLikes),
        totalShares: Number(session.totalShares),
        totalGifts: Number(session.totalGifts),
        totalDiamonds: Number(session.totalDiamonds),
      },
    };
  });

  // GET /api/sessions/:id/comments
  fastify.get<{ Params: { id: string } }>('/sessions/:id/comments', async (request) => {
    const comments = await prisma.commentEvent.findMany({
      where: { sessionId: request.params.id },
      orderBy: { timestampUtc: 'desc' },
      take: 100,
      include: { user: true },
    });
    return { success: true, data: comments };
  });

  // GET /api/sessions/:id/gifts
  fastify.get<{ Params: { id: string } }>('/sessions/:id/gifts', async (request) => {
    const gifts = await prisma.giftEvent.findMany({
      where: { sessionId: request.params.id },
      orderBy: { timestampUtc: 'desc' },
      take: 100,
      include: { user: true },
    });
    return {
      success: true,
      data: gifts.map((g) => ({
        ...g,
        totalDiamonds: Number(g.totalDiamonds),
      })),
    };
  });

  // GET /api/sessions/:id/battles
  fastify.get<{ Params: { id: string } }>('/sessions/:id/battles', async (request) => {
    const battles = await prisma.battleSession.findMany({
      where: { streamSessionId: request.params.id },
      orderBy: { startedAt: 'desc' },
      include: {
        participants: {
          include: { user: true },
        },
      },
    });
    return { success: true, data: battles };
  });

  // GET /api/comments/recent
  fastify.get('/comments/recent', async (request) => {
    const { limit = 25 } = request.query as any;
    const comments = await prisma.commentEvent.findMany({
      orderBy: { timestampUtc: 'desc' },
      take: Number(limit),
      include: { user: true },
    });
    return { success: true, data: comments };
  });
};
