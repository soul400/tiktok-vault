import { FastifyPluginAsync } from 'fastify';
import { getPrisma } from '@aep/database';
import { resolveCanonicalBattleTeams } from '@aep/battle-intelligence';

export const battlesRoutes: FastifyPluginAsync = async (fastify) => {
  const prisma = getPrisma();

  // Helper to format a battle record with real teams and scores
  const formatBattleRecord = (b: any) => {
    const latestArmies = b.events?.[0]?.payload as any;
    const eventTeams = latestArmies?.teams;

    const streamer = b.session?.streamer;
    const streamerUsername = streamer?.username || 'mohra.2000';

    // Find streamer's user record in participants if present
    const streamerParticipant = b.participants.find((p: any) =>
      p.user?.uniqueId?.toLowerCase() === streamerUsername.toLowerCase()
    );
    const streamerUserId = streamerParticipant?.user?.userId || '';

    // Collect all raw participants from DB participants
    const rawParticipants = b.participants.map((p: any, idx: number) => ({
      userId: p.user?.userId || p.userId || `part_${idx}`,
      uniqueId: p.user?.uniqueId,
      nickname: p.user?.nickname,
      avatarUrl: p.user?.avatarUrl,
      score: Number(p.score || 0),
      sourceTeamId: p.teamId,
      isCurrentHost: p.user?.uniqueId?.toLowerCase() === streamerUsername.toLowerCase(),
      sourceIndex: idx,
    }));

    // If latestArmies has eventTeams, extract source team armies
    let sourceTeamArmies: any = undefined;
    if (latestArmies?.teams && Array.isArray(latestArmies.teams)) {
      sourceTeamArmies = latestArmies.teams.map((t: any, idx: number) => ({
        teamId: t.teamId || idx + 1,
        teamUsers: (t.hosts || []).map((h: any) => ({
          userIdStr: h.userId,
          userId: h.userId,
          score: Number(h.score || 0),
        })),
        totalScore: Number(t.score || 0),
      }));
    }

    const canonical = resolveCanonicalBattleTeams({
      battleId: b.battleId,
      sessionId: b.streamSessionId,
      battleType: b.battleType as any,
      trackedStreamer: {
        userId: streamerUserId,
        username: streamerUsername,
        roomId: b.session?.roomId,
      },
      participants: rawParticipants,
      sourceTeamArmies,
      sourceTeamScores: {
        team1Score: Number(eventTeams?.find((t: any) => t.teamId === 'TEAM_A')?.score || 0),
        team2Score: Number(eventTeams?.find((t: any) => t.teamId === 'TEAM_B')?.score || 0),
      },
    });

    const teamAScore = canonical.teamA.score;
    const teamBScore = canonical.teamB.score;

    // Team A Hosts: index 0 is guaranteed to be streamer, index 1 partner
    const teamAHosts = canonical.teamA.hosts.map((h) => ({
      userId: h.userId,
      uniqueId: h.uniqueId,
      nickname: h.nickname,
      avatarUrl: h.avatarUrl || (h.uniqueId === streamerUsername ? streamer?.profileImage : ''),
      score: h.score,
      isHost: h.isHost,
      isPartner: h.isPartner,
    }));

    // Team B Hosts: index 0 is primary rival, index 1 rival partner
    const teamBHosts = canonical.teamB.hosts.map((h) => ({
      userId: h.userId,
      uniqueId: h.uniqueId,
      nickname: h.nickname,
      avatarUrl: h.avatarUrl,
      score: h.score,
      isHost: h.isHost,
      isPartner: h.isPartner,
    }));

    return {
      ...b,
      battleType: canonical.battleType,
      teamAScore,
      teamBScore,
      hostScore: teamAScore,
      rivalScore: teamBScore,
      rivalUsername: teamBHosts[0]?.uniqueId || 'rival',
      rivalNickname: teamBHosts[0]?.nickname || 'المنافس',
      rivalImage: teamBHosts[0]?.avatarUrl || '',
      teams: [
        {
          teamId: 'TEAM_A',
          score: teamAScore,
          hosts: teamAHosts,
          contributors: latestArmies?.teams?.find((t: any) => t.teamId === 'TEAM_A')?.contributors || [],
        },
        {
          teamId: 'TEAM_B',
          score: teamBScore,
          hosts: teamBHosts,
          contributors: latestArmies?.teams?.find((t: any) => t.teamId === 'TEAM_B')?.contributors || [],
        },
      ],
      participants: b.participants.map((p: any) => ({
        ...p,
        score: Number(p.score),
        diamondsCount: Number(p.diamondsCount),
        likesCount: Number(p.likesCount),
      })),
    };
  };

  // GET /api/battles/latest - Latest battle for a streamer (live or most recent historical)
  fastify.get('/battles/latest', async (request, reply) => {
    const { streamerId } = request.query as any;
    if (!streamerId) {
      return reply.status(400).send({ error: 'streamerId is required' });
    }

    const battle = await prisma.battleSession.findFirst({
      where: {
        session: { streamerId },
      },
      orderBy: { startedAt: 'desc' },
      include: {
        session: {
          include: { streamer: true },
        },
        participants: {
          include: { user: true },
        },
        events: {
          where: { eventType: 'ARMIES_UPDATE' },
          orderBy: { timestampUtc: 'desc' },
          take: 1,
        },
      },
    });

    if (!battle) return reply.status(404).send({ error: 'No battles found for this streamer' });

    return {
      success: true,
      data: formatBattleRecord(battle),
    };
  });

  // GET /api/battles/history - All battles for a streamer with pagination
  fastify.get('/battles/history', async (request) => {
    const { streamerId, limit = 20, offset = 0 } = request.query as any;

    const where = streamerId ? { session: { streamerId } } : undefined;

    const [battles, total] = await Promise.all([
      prisma.battleSession.findMany({
        where,
        orderBy: { startedAt: 'desc' },
        take: Number(limit),
        skip: Number(offset),
        include: {
          session: {
            include: { streamer: true },
          },
          participants: {
            include: { user: true },
          },
          events: {
            where: { eventType: 'ARMIES_UPDATE' },
            orderBy: { timestampUtc: 'desc' },
            take: 1,
          },
        },
      }),
      prisma.battleSession.count({ where }),
    ]);

    return {
      success: true,
      data: battles.map(formatBattleRecord),
      pagination: { total, limit: Number(limit), offset: Number(offset) },
    };
  });

  // GET /api/battles
  fastify.get('/battles', async (request) => {
    const { status, limit = 20 } = request.query as any;
    const battles = await prisma.battleSession.findMany({
      where: status ? { status } : undefined,
      orderBy: { startedAt: 'desc' },
      take: Number(limit),
      include: {
        session: {
          include: { streamer: true },
        },
        participants: {
          include: { user: true },
        },
        events: {
          where: { eventType: 'ARMIES_UPDATE' },
          orderBy: { timestampUtc: 'desc' },
          take: 1,
        },
      },
    });

    return {
      success: true,
      data: battles.map(formatBattleRecord),
    };
  });

  // GET /api/battles/:id
  fastify.get<{ Params: { id: string } }>('/battles/:id', async (request, reply) => {
    const battle = await prisma.battleSession.findUnique({
      where: { id: request.params.id },
      include: {
        session: {
          include: { streamer: true },
        },
        participants: {
          include: { user: true },
        },
        events: {
          orderBy: { timestampUtc: 'asc' },
        },
        powerUpTx: {
          include: {
            user: true,
            powerUp: true,
          },
        },
      },
    });

    if (!battle) return reply.status(404).send({ error: 'Battle not found' });

    return {
      success: true,
      data: formatBattleRecord(battle),
    };
  });
};
