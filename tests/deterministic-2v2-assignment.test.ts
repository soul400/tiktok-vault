import { describe, it, expect } from 'vitest';
import {
  resolveCanonicalBattleTeams,
  RawBattleParticipantInput,
  TrackedStreamerAnchor,
} from '../packages/battle-intelligence/src/canonical-team-assignment';

describe('Deterministic 2v2 TikTok LIVE Team Assignment Engine', () => {
  const trackedStreamer: TrackedStreamerAnchor = {
    userId: '7175470052052632577',
    username: 'mohra.2000',
    roomId: '7175470052052632000',
  };

  const streamerP: RawBattleParticipantInput = {
    userId: '7175470052052632577',
    uniqueId: 'mohra.2000',
    nickname: 'المهره 💛',
    score: 1000,
    sourceTeamId: '1',
    isCurrentHost: true,
    sourceIndex: 0,
  };

  const partnerP: RawBattleParticipantInput = {
    userId: '7200000000000000001',
    uniqueId: 'teammate_pro',
    nickname: 'شريك المضيف',
    score: 500,
    sourceTeamId: '1',
    isCurrentHost: false,
    sourceIndex: 1,
  };

  const rival1P: RawBattleParticipantInput = {
    userId: '7300000000000000001',
    uniqueId: 'rival_alpha',
    nickname: 'المنافس الأول',
    score: 1200,
    sourceTeamId: '2',
    isCurrentHost: false,
    sourceIndex: 2,
  };

  const rival2P: RawBattleParticipantInput = {
    userId: '7400000000000000001',
    uniqueId: 'rival_beta',
    nickname: 'المنافس الثاني',
    score: 800,
    sourceTeamId: '2',
    isCurrentHost: false,
    sourceIndex: 3,
  };

  // ---------------------------------------------------------------------------
  // SCENARIO 1: Streamer 1st in participant list
  // ---------------------------------------------------------------------------
  it('Scenario 1: Streamer 1st in participant list anchors to Team A index 0', () => {
    const participants = [streamerP, partnerP, rival1P, rival2P];
    const res = resolveCanonicalBattleTeams({
      battleId: 'B_001',
      sessionId: 'S_001',
      battleType: '2v2',
      trackedStreamer,
      participants,
    });

    expect(res.teamA.hosts).toHaveLength(2);
    expect(res.teamA.hosts[0].userId).toBe(trackedStreamer.userId);
    expect(res.teamA.hosts[0].isHost).toBe(true);
    expect(res.teamA.hosts[1].userId).toBe(partnerP.userId);
    expect(res.teamA.hosts[1].isPartner).toBe(true);

    expect(res.teamB.hosts).toHaveLength(2);
    expect(res.teamB.hosts.some((h) => h.userId === rival1P.userId)).toBe(true);
    expect(res.teamB.hosts.some((h) => h.userId === rival2P.userId)).toBe(true);
  });

  // ---------------------------------------------------------------------------
  // SCENARIO 2: Streamer list reversed (Streamer last)
  // ---------------------------------------------------------------------------
  it('Scenario 2: Streamer reversed in participant list still anchors to Team A index 0', () => {
    const participants = [rival2P, rival1P, partnerP, streamerP];
    const res = resolveCanonicalBattleTeams({
      battleId: 'B_002',
      sessionId: 'S_001',
      battleType: '2v2',
      trackedStreamer,
      participants,
    });

    expect(res.teamA.hosts[0].userId).toBe(trackedStreamer.userId);
    expect(res.teamA.hosts[0].isHost).toBe(true);
    expect(res.teamA.hosts[1].userId).toBe(partnerP.userId);

    const teamBUserIds = res.teamB.hosts.map((h) => h.userId);
    expect(teamBUserIds).toContain(rival1P.userId);
    expect(teamBUserIds).toContain(rival2P.userId);
  });

  // ---------------------------------------------------------------------------
  // SCENARIO 3: Streamer 3rd/4th in list
  // ---------------------------------------------------------------------------
  it('Scenario 3: Streamer at arbitrary index (3rd) is correctly anchored to Team A index 0', () => {
    const participants = [rival1P, partnerP, streamerP, rival2P];
    const res = resolveCanonicalBattleTeams({
      battleId: 'B_003',
      sessionId: 'S_001',
      battleType: '2v2',
      trackedStreamer,
      participants,
    });

    expect(res.teamA.hosts[0].userId).toBe(trackedStreamer.userId);
    expect(res.teamA.hosts[1].userId).toBe(partnerP.userId);
    expect(res.teamB.hosts.map((h) => h.userId)).toContain(rival1P.userId);
    expect(res.teamB.hosts.map((h) => h.userId)).toContain(rival2P.userId);
  });

  // ---------------------------------------------------------------------------
  // SCENARIO 4: Source team order inverted vs display (Streamer in group 2)
  // ---------------------------------------------------------------------------
  it('Scenario 4: Source team order inverted (Streamer in group 2) maps correctly to Team A', () => {
    const res = resolveCanonicalBattleTeams({
      battleId: 'B_004',
      sessionId: 'S_001',
      battleType: '2v2',
      trackedStreamer,
      participants: [streamerP, partnerP, rival1P, rival2P],
      sourceTeamUsers: [
        { teamId: 1, userIds: [rival1P.userId, rival2P.userId] },
        { teamId: 2, userIds: [streamerP.userId, partnerP.userId] },
      ],
    });

    expect(res.teamA.hosts[0].userId).toBe(streamerP.userId);
    expect(res.teamA.hosts[1].userId).toBe(partnerP.userId);
    expect(res.teamB.hosts.map((h) => h.userId)).toContain(rival1P.userId);
    expect(res.teamB.hosts.map((h) => h.userId)).toContain(rival2P.userId);
  });

  // ---------------------------------------------------------------------------
  // SCENARIO 5: Reordered score events with unchanged membership
  // ---------------------------------------------------------------------------
  it('Scenario 5: Reordered score updates maintain exact team membership and roles', () => {
    const initial = resolveCanonicalBattleTeams({
      battleId: 'B_005',
      sessionId: 'S_001',
      battleType: '2v2',
      trackedStreamer,
      participants: [streamerP, partnerP, rival1P, rival2P],
    });

    const reorderedUpdated = resolveCanonicalBattleTeams({
      battleId: 'B_005',
      sessionId: 'S_001',
      battleType: '2v2',
      trackedStreamer,
      participants: [
        { ...rival2P, score: 9999 },
        { ...streamerP, score: 8888 },
        { ...partnerP, score: 7777 },
        { ...rival1P, score: 6666 },
      ],
      previousAssignment: initial,
    });

    expect(reorderedUpdated.teamA.hosts[0].userId).toBe(streamerP.userId);
    expect(reorderedUpdated.teamA.hosts[0].score).toBe(8888);
    expect(reorderedUpdated.teamA.hosts[1].userId).toBe(partnerP.userId);
    expect(reorderedUpdated.teamA.hosts[1].score).toBe(7777);
  });

  // ---------------------------------------------------------------------------
  // SCENARIO 6: Partial army update
  // ---------------------------------------------------------------------------
  it('Scenario 6: Partial army update preserves team structure and updates scores', () => {
    const res = resolveCanonicalBattleTeams({
      battleId: 'B_006',
      sessionId: 'S_001',
      battleType: '2v2',
      trackedStreamer,
      participants: [streamerP, partnerP, rival1P, rival2P],
      sourceTeamArmies: [
        {
          teamId: 1,
          teamUsers: [
            { userIdStr: streamerP.userId, score: 3500 },
            { userIdStr: partnerP.userId, score: 1500 },
          ],
          totalScore: 5000,
        },
        {
          teamId: 2,
          teamUsers: [{ userIdStr: rival1P.userId, score: 2000 }],
          totalScore: 2000,
        },
      ],
    });

    expect(res.teamA.score).toBe(5000);
    expect(res.teamB.score).toBe(2000);
    expect(res.teamA.hosts[0].userId).toBe(streamerP.userId);
  });

  // ---------------------------------------------------------------------------
  // SCENARIO 7: Duplicate events (Idempotence)
  // ---------------------------------------------------------------------------
  it('Scenario 7: Duplicate events produce strictly idempotent output', () => {
    const input = {
      battleId: 'B_007',
      sessionId: 'S_001',
      battleType: '2v2' as const,
      trackedStreamer,
      participants: [streamerP, partnerP, rival1P, rival2P],
    };

    const res1 = resolveCanonicalBattleTeams(input);
    const res2 = resolveCanonicalBattleTeams({
      ...input,
      previousAssignment: res1,
    });

    expect(res2.teamA.hosts[0].userId).toBe(res1.teamA.hosts[0].userId);
    expect(res2.teamA.hosts[1].userId).toBe(res1.teamA.hosts[1].userId);
    expect(res2.teamB.hosts[0].userId).toBe(res1.teamB.hosts[0].userId);
    expect(res2.teamB.hosts[1].userId).toBe(res1.teamB.hosts[1].userId);
    expect(res2.teamA.score).toBe(res1.teamA.score);
    expect(res2.teamB.score).toBe(res1.teamB.score);
  });

  // ---------------------------------------------------------------------------
  // SCENARIO 8: Out-of-order events
  // ---------------------------------------------------------------------------
  it('Scenario 8: Non-compounding scores prevent regression on out-of-order events', () => {
    const initial = resolveCanonicalBattleTeams({
      battleId: 'B_008',
      sessionId: 'S_001',
      battleType: '2v2',
      trackedStreamer,
      participants: [
        { ...streamerP, score: 10000 },
        { ...partnerP, score: 5000 },
        { ...rival1P, score: 4000 },
        { ...rival2P, score: 2000 },
      ],
    });

    // Stale event arriving with lower score
    const staleUpdate = resolveCanonicalBattleTeams({
      battleId: 'B_008',
      sessionId: 'S_001',
      battleType: '2v2',
      trackedStreamer,
      participants: [
        { ...streamerP, score: 8000 },
        { ...partnerP, score: 3000 },
        { ...rival1P, score: 2000 },
        { ...rival2P, score: 1000 },
      ],
      previousAssignment: initial,
    });

    // Non-compounding monotonic guarantee: score does not regress
    expect(staleUpdate.teamA.score).toBeGreaterThanOrEqual(15000);
    expect(staleUpdate.teamB.score).toBeGreaterThanOrEqual(6000);
  });

  // ---------------------------------------------------------------------------
  // SCENARIO 9: New battle transition
  // ---------------------------------------------------------------------------
  it('Scenario 9: New battle transition resets scores and builds clean state', () => {
    const previousBattle = resolveCanonicalBattleTeams({
      battleId: 'B_OLD',
      sessionId: 'S_001',
      battleType: '2v2',
      trackedStreamer,
      participants: [
        { ...streamerP, score: 50000 },
        { ...partnerP, score: 25000 },
      ],
    });

    const newBattle = resolveCanonicalBattleTeams({
      battleId: 'B_NEW',
      sessionId: 'S_001',
      battleType: '2v2',
      trackedStreamer,
      participants: [
        { ...streamerP, score: 0 },
        { ...partnerP, score: 0 },
        { ...rival1P, score: 0 },
        { ...rival2P, score: 0 },
      ],
      previousAssignment: previousBattle, // Should be ignored because battleId differs
    });

    expect(newBattle.battleId).toBe('B_NEW');
    expect(newBattle.teamA.score).toBe(0);
    expect(newBattle.teamB.score).toBe(0);
  });

  // ---------------------------------------------------------------------------
  // SCENARIO 10: Reconnect state recovery
  // ---------------------------------------------------------------------------
  it('Scenario 10: Reconnect state recovers canonical teams from cached session state', () => {
    const cachedState = resolveCanonicalBattleTeams({
      battleId: 'B_010',
      sessionId: 'S_001',
      battleType: '2v2',
      trackedStreamer,
      participants: [streamerP, partnerP, rival1P, rival2P],
    });

    // Reconnected event arrives with only minimal user objects
    const reconnected = resolveCanonicalBattleTeams({
      battleId: 'B_010',
      sessionId: 'S_001',
      battleType: '2v2',
      trackedStreamer,
      participants: [
        { userId: rival1P.userId, score: 2000 },
        { userId: streamerP.userId, score: 4000 },
        { userId: rival2P.userId, score: 1000 },
        { userId: partnerP.userId, score: 3000 },
      ],
      previousAssignment: cachedState,
    });

    expect(reconnected.teamA.hosts[0].userId).toBe(streamerP.userId);
    expect(reconnected.teamA.hosts[1].userId).toBe(partnerP.userId);
    expect(reconnected.teamB.hosts.map((h) => h.userId)).toContain(rival1P.userId);
    expect(reconnected.teamB.hosts.map((h) => h.userId)).toContain(rival2P.userId);
  });

  // ---------------------------------------------------------------------------
  // SCENARIO 11: Partner change / bestTeammateRelation
  // ---------------------------------------------------------------------------
  it('Scenario 11: Authoritative bestTeammateRelation resolves partner deterministically', () => {
    const newTeammate: RawBattleParticipantInput = {
      userId: '7299999999999999999',
      uniqueId: 'brand_new_partner',
      nickname: 'شريك جديد',
      score: 100,
    };

    const res = resolveCanonicalBattleTeams({
      battleId: 'B_011',
      sessionId: 'S_001',
      battleType: '2v2',
      trackedStreamer,
      participants: [streamerP, rival1P, newTeammate, rival2P],
      bestTeammateRelation: {
        userId: streamerP.userId,
        bestTeammateId: newTeammate.userId,
      },
    });

    expect(res.sourceEvidence.ruleApplied).toBe('BEST_TEAMMATE_RELATION');
    expect(res.teamA.hosts[0].userId).toBe(streamerP.userId);
    expect(res.teamA.hosts[1].userId).toBe(newTeammate.userId);
    expect(res.teamB.hosts.map((h) => h.userId)).toContain(rival1P.userId);
    expect(res.teamB.hosts.map((h) => h.userId)).toContain(rival2P.userId);
  });

  // ---------------------------------------------------------------------------
  // SCENARIO 12: Conflicting/missing IDs (fallback without guessing)
  // ---------------------------------------------------------------------------
  it('Scenario 12: Fallback resolves safely without crashing on missing data', () => {
    const res = resolveCanonicalBattleTeams({
      battleId: 'B_012',
      sessionId: 'S_001',
      battleType: '2v2',
      trackedStreamer,
      participants: [
        { userId: 'unknown_1', score: 0 },
        { userId: streamerP.userId, score: 50 },
      ],
    });

    expect(res.teamA.hosts[0].userId).toBe(streamerP.userId);
    expect(res.teamA.hosts[0].isHost).toBe(true);
    expect(res.teamB.hosts[0].userId).toBe('unknown_1');
  });

  // ---------------------------------------------------------------------------
  // SCENARIO 13: STRICT PERMUTATION INVARIANCE TEST (All 24 permutations)
  // ---------------------------------------------------------------------------
  it('Scenario 13: Strict Permutation Invariance — all 24 permutations yield IDENTICAL Team A and Team B', () => {
    const pList = [streamerP, partnerP, rival1P, rival2P];

    // Helper to generate all permutations of an array
    function permute<T>(arr: T[]): T[][] {
      if (arr.length <= 1) return [arr];
      const result: T[][] = [];
      for (let i = 0; i < arr.length; i++) {
        const current = arr[i];
        const remaining = [...arr.slice(0, i), ...arr.slice(i + 1)];
        for (const p of permute(remaining)) {
          result.push([current, ...p]);
        }
      }
      return result;
    }

    const allPermutations = permute(pList);
    expect(allPermutations).toHaveLength(24);

    // Reference baseline
    const baseline = resolveCanonicalBattleTeams({
      battleId: 'B_PERM',
      sessionId: 'S_001',
      battleType: '2v2',
      trackedStreamer,
      participants: allPermutations[0],
    });

    const baselineTeamA = baseline.teamA.hosts.map((h) => `${h.userId}:${h.isHost}:${h.isPartner}`);
    const baselineTeamB = baseline.teamB.hosts.map((h) => `${h.userId}:${h.isHost}:${h.isPartner}`);

    for (let i = 1; i < allPermutations.length; i++) {
      const currentRes = resolveCanonicalBattleTeams({
        battleId: 'B_PERM',
        sessionId: 'S_001',
        battleType: '2v2',
        trackedStreamer,
        participants: allPermutations[i],
      });

      const currentTeamA = currentRes.teamA.hosts.map((h) => `${h.userId}:${h.isHost}:${h.isPartner}`);
      const currentTeamB = currentRes.teamB.hosts.map((h) => `${h.userId}:${h.isHost}:${h.isPartner}`);

      expect(currentTeamA).toEqual(baselineTeamA);
      expect(currentTeamB).toEqual(baselineTeamB);
    }
  });
});
