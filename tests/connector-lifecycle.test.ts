import { describe, it, expect } from 'vitest';
import { MockTikTokLiveConnectorAdapter } from '../packages/tiktok-connectors/src/mock.adapter';
import { UniversalEventType } from '../packages/event-model/src/types';

describe('Connector Lifecycle & Event Dispatching', () => {
  it('should handle connect, state transitions, event dispatching, and disconnect', async () => {
    const connector = new MockTikTokLiveConnectorAdapter('streamer_vip');
    const stateHistory: string[] = [];
    const receivedEvents: any[] = [];

    connector.onStateChange((newState) => {
      stateHistory.push(newState);
    });

    connector.onEvent((ev) => {
      receivedEvents.push(ev);
    });

    // Check live
    const liveStatus = await connector.checkIsLive();
    expect(liveStatus.isLive).toBe(true);

    // Connect
    const success = await connector.connect({
      sessionId: 'session-mock-123',
      streamerId: 'streamer-uuid-456',
    });
    expect(success).toBe(true);
    expect(connector.state).toBe('LIVE');
    expect(stateHistory).toContain('LIVE');

    // Dispatch simulated events
    connector.dispatchMockEvent({
      eventType: UniversalEventType.CHAT_COMMENT,
      payload: { commentId: 'c1', text: 'مرحباً بالجميع' },
      user: { userId: '1001', uniqueId: 'Ahmed', nickname: 'أحمد' },
    });

    connector.dispatchMockEvent({
      eventType: UniversalEventType.GIFT_RECEIVED,
      payload: { giftId: '6038', giftName: 'Boxing Gloves', diamondCost: 299, repeatCount: 1, totalDiamonds: 299 },
      user: { userId: '1001', uniqueId: 'Ahmed', nickname: 'أحمد' },
    });

    expect(receivedEvents.length).toBe(2);
    expect(receivedEvents[0].eventType).toBe(UniversalEventType.CHAT_COMMENT);
    expect(receivedEvents[1].eventType).toBe(UniversalEventType.GIFT_RECEIVED);
    expect(connector.telemetry.totalEventsReceived).toBe(2);

    // Disconnect
    await connector.disconnect();
    expect(connector.state).toBe('OFFLINE');
    expect(stateHistory[stateHistory.length - 1]).toBe('OFFLINE');
  });
});
