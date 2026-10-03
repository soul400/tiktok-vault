import { describe, it, expect } from 'vitest';
import { DeduplicationGate } from '../packages/event-pipeline/src/deduplicator';
import { LiveEventEnvelope, UniversalEventType } from '../packages/event-model/src/types';

describe('Deduplication Gate', () => {
  it('should allow unique event and drop duplicate with same providerTransactionId', async () => {
    const gate = new DeduplicationGate(null, 60);

    const event1: LiveEventEnvelope = {
      id: 'uuid-1',
      eventId: 'ev-1',
      provider: 'TIKTOK_LIVE_CONNECTOR',
      providerVersion: '2.5.0',
      providerEventName: 'gift',
      providerTransactionId: 'tx_gift_998877',
      streamerId: 'streamer-1',
      streamerUsername: 'streamer_alpha',
      sessionId: 'session-1',
      roomId: 'room-1',
      timestampUtc: new Date().toISOString(),
      receivedAtUtc: new Date().toISOString(),
      eventType: UniversalEventType.GIFT_RECEIVED,
      payload: { giftId: '5655', totalDiamonds: 1 },
    };

    const isFirstUnique = await gate.isUnique(event1);
    expect(isFirstUnique).toBe(true);

    // Same transaction ID arrives again
    const eventDuplicate: LiveEventEnvelope = {
      ...event1,
      id: 'uuid-duplicate-2',
    };

    const isSecondUnique = await gate.isUnique(eventDuplicate);
    expect(isSecondUnique).toBe(false);
    expect(gate.duplicatesDetected).toBe(1);
  });

  it('should detect duplicate by providerEventId', async () => {
    const gate = new DeduplicationGate(null, 60);

    const event1: LiveEventEnvelope = {
      id: 'uuid-3',
      eventId: 'ev-3',
      provider: 'TIKTOK_LIVE_CONNECTOR',
      providerVersion: '2.5.0',
      providerEventName: 'chat',
      providerEventId: 'msg_11223344',
      streamerId: 'streamer-1',
      streamerUsername: 'streamer_alpha',
      sessionId: 'session-1',
      roomId: 'room-1',
      timestampUtc: new Date().toISOString(),
      receivedAtUtc: new Date().toISOString(),
      eventType: UniversalEventType.CHAT_COMMENT,
      payload: { text: 'Hello' },
    };

    expect(await gate.isUnique(event1)).toBe(true);
    expect(await gate.isUnique(event1)).toBe(false);
  });
});
