import { FastifyPluginAsync } from 'fastify';
import { getPrisma } from '@aep/database';

export const battlesRoutes: FastifyPluginAsync = async (fastify) => {
  const prisma = getPrisma();

  // Helper to format a battle record with real teams and scores
  const formatBattleRecord = (b: any) => {
    const latestArmies = b.events?.[0]?.payload as any;
    const eventTeams = latestArmies?.teams;

    let teamAScore = 0;
    let teamBScore = 0;

    if (eventTeams) {
      const tA = eventTeams.find((t: any) => t.teamId === 'TEAM_A');
      const tB = eventTeams.find((t: any) => t.teamId === 'TEAM_B');
      if (tA && tA.score !== undefined) teamAScore = Math.max(teamAScore, Number(tA.score));
      if (tB && tB.score !== undefined) teamBScore = Math.max(teamBScore, Number(tB.score));
    }

    const pSumA = b.participants.filter((p: any) => p.teamId === 'TEAM_A').reduce((s: number, p: any) => s + Number(p.score || 0), 0);
    const pSumB = b.participants.filter((p: any) => p.teamId === 'TEAM_B').reduce((s: number, p: any) => s + Number(p.score || 0), 0);
    if (teamAScore === 0 && pSumA > 0) teamAScore = pSumA;
    if (teamBScore === 0 && pSumB > 0) teamBScore = pSumB;

    // 1. Resolve Team A Hosts (prioritize rich eventTeams if present, then participants, then streamer)
    let teamAHosts: any[] = [];
    const eventTeamA = eventTeams?.find((t: any) => t.teamId === 'TEAM_A');
    if (eventTeamA?.hosts && eventTeamA.hosts.length > 0) {
      teamAHosts = eventTeamA.hosts.map((h: any) => ({
        userId: h.userId,
        uniqueId: h.uniqueId || b.session?.streamer?.username || 'mohra.2000',
        nickname: h.nickname || b.session?.streamer?.displayName || 'المهره',
        avatarUrl: h.avatarUrl || b.session?.streamer?.profileImage || '',
        score: Number(h.score || 0),
      }));
    } else {
      const uniqueA = new Map<string, any>();
      for (const p of b.participants.filter((p: any) => p.teamId === 'TEAM_A')) {
        const uid = p.user?.userId || p.userId;
        if (!uniqueA.has(uid)) {
          uniqueA.set(uid, {
            userId: uid,
            uniqueId: p.user?.uniqueId || b.session?.streamer?.username || 'mohra.2000',
            nickname: p.user?.nickname || b.session?.streamer?.displayName || 'المهره',
            avatarUrl: p.user?.avatarUrl || b.session?.streamer?.profileImage || '',
            score: Number(p.score || 0),
          });
        }
      }
      teamAHosts = Array.from(uniqueA.values());
    }

    if (teamAHosts.length === 0) {
      teamAHosts = [{
        userId: b.session?.streamer?.id || 'mohra',
        uniqueId: b.session?.streamer?.username || 'mohra.2000',
        nickname: b.session?.streamer?.displayName || 'المهره 💛',
        avatarUrl: b.session?.streamer?.profileImage || '',
        score: teamAScore,
      }];
    }

    // Ensure host 1 is cleanly labeled as the streamer
    if (teamAHosts.length > 0 && b.session?.streamer) {
      const s = b.session.streamer;
      if (!teamAHosts[0].uniqueId || /^\d+$/.test(teamAHosts[0].uniqueId) || teamAHosts[0].uniqueId === 'host') {
        teamAHosts[0].uniqueId = s.username;
      }
      if (!teamAHosts[0].nickname || /^\d+$/.test(teamAHosts[0].nickname) || teamAHosts[0].nickname === 'المضيف') {
        teamAHosts[0].nickname = s.displayName || s.username;
      }
      if (!teamAHosts[0].avatarUrl && s.profileImage) {
        teamAHosts[0].avatarUrl = s.profileImage;
      }
    }

    // 2. Resolve Team B Hosts
    let teamBHosts: any[] = [];
    const eventTeamB = eventTeams?.find((t: any) => t.teamId === 'TEAM_B');
    if (eventTeamB?.hosts && eventTeamB.hosts.length > 0) {
      teamBHosts = eventTeamB.hosts.map((h: any) => ({
        userId: h.userId,
        uniqueId: h.uniqueId || 'rival',
        nickname: h.nickname || h.uniqueId || 'المنافس',
        avatarUrl: h.avatarUrl || '',
        score: Number(h.score || 0),
      }));
    } else {
      const uniqueB = new Map<string, any>();
      for (const p of b.participants.filter((p: any) => p.teamId === 'TEAM_B')) {
        const uid = p.user?.userId || p.userId;
        if (!uniqueB.has(uid)) {
          uniqueB.set(uid, {
            userId: uid,
            uniqueId: p.user?.uniqueId || 'rival',
            nickname: p.user?.nickname || p.user?.uniqueId || 'المنافس',
            avatarUrl: p.user?.avatarUrl || '',
            score: Number(p.score || 0),
          });
        }
      }
      teamBHosts = Array.from(uniqueB.values());
    }

    // Deduplicate hosts in teamB
    const dedupB = new Map<string, any>();
    for (const h of teamBHosts) {
      const k = h.userId || h.uniqueId;
      if (!dedupB.has(k)) dedupB.set(k, h);
    }
    teamBHosts = Array.from(dedupB.values());

    // If 4 hosts were present and 1 was in Team A and 3 in Team B, the first host in Team B is the partner for Team A
    if (teamAHosts.length === 1 && teamBHosts.length === 3) {
      teamAHosts.push(teamBHosts.shift()!);
    }

    // Monotonic score aggregation
    const hostSumA = teamAHosts.reduce((s: number, h: any) => s + Number(h.score || 0), 0);
    const hostSumB = teamBHosts.reduce((s: number, h: any) => s + Number(h.score || 0), 0);
    teamAScore = Math.max(teamAScore, hostSumA);
    teamBScore = Math.max(teamBScore, hostSumB);

    const is2v2 = teamAHosts.length > 1 || teamBHosts.length > 1 || b.battleType === '2v2';
    const computedBattleType = is2v2 ? '2v2' : '1v1';

    return {
      ...b,
      battleType: computedBattleType,
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
