import { PrismaClient } from '@prisma/client';
import { Logger } from '@aep/shared';
import { BattleState, BattleArmiesUpdate } from './types.js';

export class BattleManager {
  private prisma: PrismaClient;
  private logger = new Logger('BattleManager');
  private activeBattles = new Map<string, BattleState>();

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  getActiveBattle(battleId: string): BattleState | undefined {
    return this.activeBattles.get(battleId);
  }

  async handleBattleStart(params: {
    battleId: string;
    streamSessionId: string;
    battleType: '1v1' | '2v2' | 'MULTI';
    durationSeconds: number;
    startedAt: Date;
    teams: Array<{
      teamId: string;
      hosts: Array<{ userId: string; uniqueId: string; nickname: string; avatarUrl?: string }>;
    }>;
  }): Promise<BattleState> {
    this.logger.info(`Starting battle #${params.battleId} (${params.battleType})`);

    // Close any previous in-progress battle sessions for this stream session
    if (params.streamSessionId) {
      await this.prisma.battleSession.updateMany({
        where: {
          streamSessionId: params.streamSessionId,
          status: 'IN_PROGRESS',
          battleId: { not: params.battleId },
        },
        data: {
          status: 'FINISHED',
          endedAt: params.startedAt || new Date(),
        },
      });
    }

    const battleSession = await this.prisma.battleSession.upsert({
      where: { battleId: params.battleId },
      update: {
        status: 'IN_PROGRESS',
        battleType: params.battleType,
        durationSeconds: params.durationSeconds,
      },
      create: {
        battleId: params.battleId,
        streamSessionId: params.streamSessionId,
        battleType: params.battleType,
        status: 'IN_PROGRESS',
        startedAt: params.startedAt,
        durationSeconds: params.durationSeconds,
      },
    });

    // Register host participants
    for (const team of params.teams) {
      for (const host of team.hosts) {
        if (!host.userId) continue;

        // Upsert user first
        const user = await this.prisma.user.upsert({
          where: { userId: host.userId },
          update: {
            nickname: host.nickname,
            uniqueId: host.uniqueId,
            avatarUrl: host.avatarUrl,
            lastSeenAt: new Date(),
          },
          create: {
            userId: host.userId,
            uniqueId: host.uniqueId,
            nickname: host.nickname,
            avatarUrl: host.avatarUrl,
          },
        });

        const existingParticipant = await this.prisma.battleParticipant.findFirst({
          where: {
            battleSessionId: battleSession.id,
            userId: user.id,
          },
        });

        if (!existingParticipant) {
          await this.prisma.battleParticipant.create({
            data: {
              battleSessionId: battleSession.id,
              userId: user.id,
              teamId: team.teamId,
              role: 'HOST',
            },
          });
        } else if (existingParticipant.teamId !== team.teamId) {
          await this.prisma.battleParticipant.update({
            where: { id: existingParticipant.id },
            data: { teamId: team.teamId },
          });
        }
      }
    }

    const existing = this.activeBattles.get(params.battleId);
    const teamAScoreFromParams = (params.teams?.find((t) => t.teamId === 'TEAM_A') as any)?.score ?? 0;
    const teamBScoreFromParams = (params.teams?.find((t) => t.teamId === 'TEAM_B') as any)?.score ?? 0;

    const state: BattleState = {
      battleId: params.battleId,
      streamSessionId: params.streamSessionId,
      battleType: params.battleType,
      status: 'IN_PROGRESS',
      startedAt: existing ? existing.startedAt : params.startedAt,
      teamAScore: existing ? Math.max(existing.teamAScore, teamAScoreFromParams) : teamAScoreFromParams,
      teamBScore: existing ? Math.max(existing.teamBScore, teamBScoreFromParams) : teamBScoreFromParams,
    };

    this.activeBattles.set(params.battleId, state);
    return state;
  }

  async handleArmiesUpdate(params: BattleArmiesUpdate): Promise<void> {
    const battle = this.activeBattles.get(params.battleId);
    if (battle) {
      const teamA = params.teams.find((t) => t.teamId === 'TEAM_A');
      const teamB = params.teams.find((t) => t.teamId === 'TEAM_B');
      if (teamA && teamA.score !== undefined) {
        battle.teamAScore = Math.max(battle.teamAScore, Number(teamA.score));
      }
      if (teamB && teamB.score !== undefined) {
        battle.teamBScore = Math.max(battle.teamBScore, Number(teamB.score));
      }
    }

    // Persist battle event
    const dbBattle = await this.prisma.battleSession.findUnique({
      where: { battleId: params.battleId },
    });

    if (dbBattle) {
      const teamA = params.teams.find((t) => t.teamId === 'TEAM_A');
      const teamB = params.teams.find((t) => t.teamId === 'TEAM_B');

      if (teamA && teamA.score !== undefined) {
        await this.prisma.battleParticipant.updateMany({
          where: { battleSessionId: dbBattle.id, teamId: 'TEAM_A', role: 'HOST' },
          data: { score: BigInt(teamA.score) },
        });
      }

      if (teamB && teamB.score !== undefined) {
        await this.prisma.battleParticipant.updateMany({
          where: { battleSessionId: dbBattle.id, teamId: 'TEAM_B', role: 'HOST' },
          data: { score: BigInt(teamB.score) },
        });
      }

      await this.prisma.battleEvent.create({
        data: {
          battleSessionId: dbBattle.id,
          eventType: 'ARMIES_UPDATE',
          payload: params as any,
          timestampUtc: new Date(),
        },
      });
    }
  }

  async handleBattleEnd(params: {
    battleId: string;
    winningTeamId?: string;
    isDraw?: boolean;
    endedAt: Date;
    mvpUserId?: string;
  }): Promise<void> {
    this.logger.info(`Ending battle #${params.battleId}. Winner: ${params.winningTeamId || 'DRAW'}`);
    this.activeBattles.delete(params.battleId);

    const dbBattle = await this.prisma.battleSession.findUnique({
      where: { battleId: params.battleId },
    });

    if (!dbBattle) return;

    const duration = Math.floor((params.endedAt.getTime() - dbBattle.startedAt.getTime()) / 1000);

    await this.prisma.battleSession.update({
      where: { id: dbBattle.id },
      data: {
        status: 'FINISHED',
        winningTeamId: params.winningTeamId,
        isDraw: Boolean(params.isDraw),
        endedAt: params.endedAt,
        durationSeconds: duration > 0 ? duration : dbBattle.durationSeconds,
      },
    });

    if (params.mvpUserId) {
      const user = await this.prisma.user.findUnique({ where: { userId: params.mvpUserId } });
      if (user) {
        await this.prisma.user.update({
          where: { id: user.id },
          data: { totalMvps: { increment: 1 } },
        });

        await this.prisma.battleParticipant.updateMany({
          where: { battleSessionId: dbBattle.id, userId: user.id },
          data: { isMvp: true },
        });
      }
    }
  }
}
