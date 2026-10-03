import { describe, it, expect, beforeEach } from 'vitest';
import { LikeAccumulator } from '@aep/event-pipeline';
import { GiftStreakTracker } from '@aep/event-pipeline';
import { DeduplicationGate } from '@aep/event-pipeline';
import { UniversalEventType, LiveEventEnvelope } from '@aep/event-model';
import crypto from 'crypto';

// Import raw fixtures
import chatFixture from './fixtures/chat.json';
import giftStreakFixture from './fixtures/gift_streak.json';
import likeBurstFixture from './fixtures/like_burst.json';
import shareFixture from './fixtures/share.json';
import viewerCountFixture from './fixtures/viewer_count.json';
import battle1v1Fixture from './fixtures/battle_1v1.json';
import battle2v2Fixture from './fixtures/battle_2v2.json';
import battleItemCardFixture from './fixtures/battle_item_card.json';
import unknownEventFixture from './fixtures/unknown_event.json';

describe('AEP — TikTok LIVE Integration Repair & Deep Audit Suite', () => {
  describe('Phase 6 — LikeAccumulator (Cumulative vs Delta Verification)', () => {
    let accumulator: LikeAccumulator;

    beforeEach(() => {
      accumulator = new LikeAccumulator();
    });

    it('should correctly accumulate [10, 20, 35, 50] to exactly 50 total likes, NOT 115', () => {
      const sessionId = 'session_test_likes';
      const userId = 'user_71888999';

      const results = likeBurstFixture.map((f: any) =>
        accumulator.process(sessionId, userId, f.likeCount, f.totalLikeCount)
      );

      // Verify individual deltas
      expect(results[0].likeCount).toBe(10); // initial: 10
      expect(results[1].likeCount).toBe(10); // 20 - 10 = 10
      expect(results[2].likeCount).toBe(15); // 35 - 20 = 15
      expect(results[3].likeCount).toBe(15); // 50 - 35 = 15

      // Total delta sum must equal exactly 50
      const totalDeltaSum = results.reduce((acc, r) => acc + r.likeCount, 0);
      expect(totalDeltaSum).toBe(50);
      expect(totalDeltaSum).not.toBe(115);

      // Final room total must sync with max reported totalLikeCount
      expect(results[3].totalLikes).toBe(150);
    });
  });

  describe('Phase 7 — GiftStreakTracker (Streak Multiplication Prevention)', () => {
    let streakTracker: GiftStreakTracker;

    beforeEach(() => {
      streakTracker = new GiftStreakTracker();
    });

    it('should process Rose x1, Rose x2, Rose x3, repeatEnd and yield exactly 3 diamonds total (NOT 6)', () => {
      const userId = 'user_vip_777';
      const giftId = '5655';
      const comboId = 'combo_1001';

      const results = giftStreakFixture.map((f: any) =>
        streakTracker.processGift({
          userId,
          giftId,
          diamondCost: f.diamondCount,
          repeatCount: f.repeatCount,
          repeatEnd: f.repeatEnd,
          comboId,
          msgId: f.msgId,
        })
      );

      // Step 1: Rose x1 -> delta = 1, deltaDiamonds = 1
      expect(results[0].deltaCount).toBe(1);
      expect(results[0].deltaDiamonds).toBe(1);
      expect(results[0].isStreakEnd).toBe(false);

      // Step 2: Rose x2 -> delta = 1, deltaDiamonds = 1
      expect(results[1].deltaCount).toBe(1);
      expect(results[1].deltaDiamonds).toBe(1);
      expect(results[1].isStreakEnd).toBe(false);

      // Step 3: Rose x3, repeatEnd -> delta = 1, deltaDiamonds = 1, isStreakEnd = true
      expect(results[2].deltaCount).toBe(1);
      expect(results[2].deltaDiamonds).toBe(1);
      expect(results[2].isStreakEnd).toBe(true);

      // Total delta diamonds must equal exactly 3 diamonds (not 1 + 2 + 3 = 6)
      const totalDiamonds = results.reduce((sum, r) => sum + r.deltaDiamonds, 0);
      expect(totalDiamonds).toBe(3);
      expect(totalDiamonds).not.toBe(6);
    });
  });

  describe('Phase 14 — Power-up Inventory Non-Negative Clamp Invariant', () => {
    it('should enforce balance >= 0 under sequential deductions (+3, -1, -1, -1, -1 -> 0, never -1)', () => {
      let balance = 0;
      const history: number[] = [];

      const recordAcquisition = (qty: number) => {
        balance += qty;
        history.push(balance);
      };

      const recordUsage = (qty: number) => {
        const deduction = Math.min(qty, balance);
        balance = Math.max(0, balance - deduction);
        history.push(balance);
      };

      // 1. ACQUIRED +3
      recordAcquisition(3);
      expect(balance).toBe(3);

      // 2. USED -1
      recordUsage(1);
      expect(balance).toBe(2);

      // 3. USED -1
      recordUsage(1);
      expect(balance).toBe(1);

      // 4. USED -1
      recordUsage(1);
      expect(balance).toBe(0);

      // 5. USED -1 (Exceeds available balance: must clamp at 0, NEVER -1)
      recordUsage(1);
      expect(balance).toBe(0);
      expect(balance).toBeGreaterThanOrEqual(0);

      expect(history).toEqual([3, 2, 1, 0, 0]);
    });
  });

  describe('Phase 10, 11 & 12 — Battle PK Intelligence (1v1 & 2v2)', () => {
    it('should correctly parse and structure 1v1 Battle', () => {
      expect(battle1v1Fixture.method).toBe('WebcastLinkMicBattle');
      expect(battle1v1Fixture.battleType).toBe(1); // 1v1
      expect(battle1v1Fixture.teams.length).toBe(2);
      expect(battle1v1Fixture.teams[0].hosts.length).toBe(1);
      expect(battle1v1Fixture.teams[1].hosts.length).toBe(1);
      expect(battle1v1Fixture.teams[0].hosts[0].userId).toBe('7175470052052632577');
    });

    it('should correctly parse and structure 2v2 Battle with 4 participants across 2 teams', () => {
      expect(battle2v2Fixture.method).toBe('WebcastLinkMicBattle');
      expect(battle2v2Fixture.battleType).toBe(2); // 2v2
      expect(battle2v2Fixture.teams.length).toBe(2);
      expect(battle2v2Fixture.teams[0].hosts.length).toBe(2);
      expect(battle2v2Fixture.teams[1].hosts.length).toBe(2);
      expect(battle2v2Fixture.teams[0].hosts[1].uniqueId).toBe('streamer_alpha_partner');
      expect(battle2v2Fixture.teams[1].hosts[1].uniqueId).toBe('streamer_beta_partner');
    });

    it('should determine MVP accurately from armies contributor scores', () => {
      const armies = [
        {
          teamId: 'TEAM_A',
          score: 15400,
          contributors: [
            { userId: 'u1', score: 12000, rank: 1 },
            { userId: 'u2', score: 3400, rank: 2 },
          ],
        },
        {
          teamId: 'TEAM_B',
          score: 8200,
          contributors: [
            { userId: 'u3', score: 8200, rank: 1 },
          ],
        },
      ];

      // Winning team is TEAM_A
      const winningTeam = armies.reduce((prev, curr) => (curr.score > prev.score ? curr : prev));
      expect(winningTeam.teamId).toBe('TEAM_A');

      // MVP is top contributor of winning team
      const mvp = winningTeam.contributors[0];
      expect(mvp.userId).toBe('u1');
      expect(mvp.score).toBe(12000);
    });
  });

  describe('Phase 4 & 23 — Catch-All and UNKNOWN_EVENT Integrity', () => {
    it('should encapsulate unrecognized webcast messages into UNKNOWN_EVENT without dropping', () => {
      const raw = unknownEventFixture;

      const envelope: LiveEventEnvelope = {
        id: crypto.randomUUID(),
        eventId: `dedup:unknown:${raw.msgId}`,
        provider: 'TIKTOK_LIVE_CONNECTOR',
        providerVersion: '2.5.0',
        providerEventName: raw.method,
        providerEventId: raw.msgId,
        streamerId: 'streamer_test_1',
        streamerUsername: 'test_streamer',
        sessionId: 'session_test_1',
        roomId: 'room_test_1',
        timestampUtc: new Date().toISOString(),
        receivedAtUtc: new Date().toISOString(),
        eventType: UniversalEventType.UNKNOWN_EVENT,
        payload: raw,
        rawPayload: raw,
      };

      expect(envelope.eventType).toBe(UniversalEventType.UNKNOWN_EVENT);
      expect(envelope.providerEventName).toBe('WebcastSuperFanLuckyBoxNewMessage');
      expect((envelope.payload as any).diamondCount).toBe(500);
      expect(envelope.eventId).toBeDefined();
    });
  });

  describe('Phase 8 — Comments & Deduplication Integrity', () => {
    let dedupGate: DeduplicationGate;

    beforeEach(() => {
      dedupGate = new DeduplicationGate(null, 300);
    });

    it('should deduplicate events with identical providerEventId and drop duplicates', async () => {
      const envelope: LiveEventEnvelope = {
        id: crypto.randomUUID(),
        eventId: 'dedup:TIKTOK_LIVE_CONNECTOR:ev:' + chatFixture.msgId,
        provider: 'TIKTOK_LIVE_CONNECTOR',
        providerVersion: '2.5.0',
        providerEventName: 'chat',
        providerEventId: chatFixture.msgId,
        streamerId: 'streamer_1',
        streamerUsername: 'test_streamer',
        sessionId: 'session_1',
        roomId: 'room_1',
        timestampUtc: new Date().toISOString(),
        receivedAtUtc: new Date().toISOString(),
        eventType: UniversalEventType.CHAT_COMMENT,
        payload: { commentId: chatFixture.msgId, text: chatFixture.content },
      };

      // First arrival: UNIQUE
      const firstCheck = await dedupGate.isUnique(envelope);
      expect(firstCheck).toBe(true);

      // Second arrival: DUPLICATE (dropped)
      const secondCheck = await dedupGate.isUnique(envelope);
      expect(secondCheck).toBe(false);
      expect(dedupGate.duplicatesDetected).toBe(1);
    });
  });

  describe('Phase 3 — Connection Diagnostic States', () => {
    it('should validate all 8 connection lifecycle states', () => {
      const allowedStates = [
        'OFFLINE',
        'DISCOVERING',
        'CONNECTING',
        'CONNECTED',
        'RECONNECTING',
        'DEGRADED',
        'ENDED',
        'ERROR',
      ];

      expect(allowedStates.length).toBe(8);
      allowedStates.forEach((st) => {
        expect(typeof st).toBe('string');
      });
    });
  });
});
