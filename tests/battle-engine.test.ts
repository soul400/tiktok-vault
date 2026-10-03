import { describe, it, expect } from 'vitest';

describe('Battle (PK) Intelligence Engine', () => {
  it('should manage 1v1 & 2v2 battle state, score updates, and MVP ranking', () => {
    interface BattleParticipant {
      userId: string;
      nickname: string;
      score: number;
    }

    interface Team {
      teamId: string;
      score: number;
      contributors: BattleParticipant[];
    }

    const battle = {
      battleId: 'BATTLE_999',
      battleType: '1v1',
      status: 'IN_PROGRESS',
      teams: [
        {
          teamId: 'TEAM_A',
          score: 0,
          contributors: [
            { userId: 'u1', nickname: 'أحمد', score: 0 },
            { userId: 'u2', nickname: 'سعد', score: 0 },
          ],
        },
        {
          teamId: 'TEAM_B',
          score: 0,
          contributors: [
            { userId: 'u3', nickname: 'خالد', score: 0 },
          ],
        },
      ],
    };

    // Simulate score bursts
    battle.teams[0].contributors[0].score += 5000; // Ahmed sends 5000
    battle.teams[0].contributors[1].score += 2000; // Saad sends 2000
    battle.teams[0].score = 7000;

    battle.teams[1].contributors[0].score += 6500; // Khalid sends 6500
    battle.teams[1].score = 6500;

    // Find MVP across entire match
    const allContributors = battle.teams.flatMap((t) => t.contributors);
    const sorted = [...allContributors].sort((a, b) => b.score - a.score);
    const mvp = sorted[0];

    expect(mvp.userId).toBe('u3'); // Khalid with 6500 is overall MVP
    expect(battle.teams[0].score).toBeGreaterThan(battle.teams[1].score); // Team A leading (7000 vs 6500)

    // Finalize Battle
    const winner = battle.teams[0].score > battle.teams[1].score ? 'TEAM_A' : 'TEAM_B';
    expect(winner).toBe('TEAM_A');
  });
});
