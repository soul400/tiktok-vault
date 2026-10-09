import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';
import { resolveCanonicalBattleTeams } from '../packages/battle-intelligence/src/canonical-team-assignment';

dotenv.config({ path: path.resolve(__dirname, '../apps/api/.env') });
dotenv.config();

const prisma = new PrismaClient();

async function repairCanonicalTeams() {
  console.log('🔄 Starting Historical 2v2 Battle Canonical Repair...');

  const battles = await prisma.battleSession.findMany({
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
    orderBy: { startedAt: 'desc' },
  });

  console.log(`Found ${battles.length} total battle session(s) in database.`);

  let repairedCount = 0;

  for (const battle of battles) {
    const streamer = battle.session?.streamer;
    const streamerUsername = streamer?.username || 'mohra.2000';

    const streamerParticipant = battle.participants.find((p) =>
      p.user?.uniqueId?.toLowerCase() === streamerUsername.toLowerCase()
    );
    const streamerUserId = streamerParticipant?.user?.userId || '';

    const latestArmies = battle.events?.[0]?.payload as any;
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

    const rawParticipants = battle.participants.map((p, idx) => ({
      userId: p.user?.userId || p.userId || `part_${idx}`,
      uniqueId: p.user?.uniqueId,
      nickname: p.user?.nickname,
      avatarUrl: p.user?.avatarUrl,
      score: Number(p.score || 0),
      sourceTeamId: p.teamId,
      isCurrentHost: p.user?.uniqueId?.toLowerCase() === streamerUsername.toLowerCase(),
      sourceIndex: idx,
    }));

    const canonical = resolveCanonicalBattleTeams({
      battleId: battle.battleId,
      sessionId: battle.streamSessionId,
      battleType: battle.battleType as any,
      trackedStreamer: {
        userId: streamerUserId,
        username: streamerUsername,
        roomId: battle.session?.roomId,
      },
      participants: rawParticipants,
      sourceTeamArmies,
    });

    console.log(`\n--- Inspecting Battle: ${battle.battleId} (${battle.battleType}) ---`);
    console.log(`Resolution Strategy: ${canonical.resolutionStrategy}, Confidence: ${canonical.confidence}`);
    console.log(`Canonical Team A: [${canonical.teamA.hosts.map((h) => `@${h.uniqueId} (${h.role})`).join(', ')}]`);
    console.log(`Canonical Team B: [${canonical.teamB.hosts.map((h) => `@${h.uniqueId} (${h.role})`).join(', ')}]`);

    let modifiedInBattle = false;

    for (const participant of battle.participants) {
      const pUser = participant.user;
      const uid = pUser?.userId || participant.userId;
      const uname = pUser?.uniqueId?.toLowerCase();

      // Check if this participant is in canonical team A
      const teamAIdx = canonical.teamA.hosts.findIndex(
        (h) => (uid && h.userId === uid) || (uname && h.uniqueId?.toLowerCase() === uname)
      );

      // Check if this participant is in canonical team B
      const teamBIdx = canonical.teamB.hosts.findIndex(
        (h) => (uid && h.userId === uid) || (uname && h.uniqueId?.toLowerCase() === uname)
      );

      let targetTeamId: string | null = null;
      let targetRole: string | null = null;

      if (teamAIdx !== -1) {
        targetTeamId = 'TEAM_A';
        targetRole = teamAIdx === 0 ? 'HOST' : 'PARTNER';
      } else if (teamBIdx !== -1) {
        targetTeamId = 'TEAM_B';
        targetRole = teamBIdx === 0 ? 'HOST' : 'PARTNER';
      }

      if (targetTeamId && (participant.teamId !== targetTeamId || participant.role !== targetRole)) {
        console.log(
          `  -> Correcting Participant @${pUser?.uniqueId}: ` +
          `[${participant.teamId}, ${participant.role}] => [${targetTeamId}, ${targetRole}]`
        );

        await prisma.battleParticipant.update({
          where: { id: participant.id },
          data: {
            teamId: targetTeamId,
            role: targetRole,
          },
        });
        modifiedInBattle = true;
      }
    }

    if (modifiedInBattle) {
      repairedCount++;
    }
  }

  console.log(`\n✅ Canonical Team Repair Completed. Repaired ${repairedCount} battle(s).`);
}

repairCanonicalTeams()
  .catch((err) => {
    console.error('❌ Error during repair:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
