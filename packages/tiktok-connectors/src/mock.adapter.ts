import {
  LiveEventEnvelope,
  UniversalEventType,
  ChatCommentPayload,
  LikeBurstPayload,
  GiftReceivedPayload,
  ViewerCountPayload,
  PowerUpEventPayload,
  BattleStartPayload,
  BattleUpdatePayload,
} from '@aep/event-model';
import { ITikTokLiveConnector } from './adapter.interface.js';
import {
  ConnectorState,
  ConnectorHealthTelemetry,
  ConnectorOptions,
  EventCallback,
  HealthCallback,
  StateChangeCallback,
} from './types.js';

export class MockTikTokLiveConnectorAdapter implements ITikTokLiveConnector {
  public readonly streamerUsername: string;
  private _state: ConnectorState = 'OFFLINE';
  private eventCallbacks: EventCallback[] = [];
  private healthCallbacks: HealthCallback[] = [];
  private stateCallbacks: StateChangeCallback[] = [];
  private options?: ConnectorOptions;
  private simulationTimer: NodeJS.Timeout | null = null;

  private _telemetry: ConnectorHealthTelemetry;

  constructor(streamerUsername: string) {
    this.streamerUsername = streamerUsername.replace(/^@/, '');
    this._telemetry = {
      streamerUsername: this.streamerUsername,
      state: 'OFFLINE',
      eventsPerSec: 0,
      totalEventsReceived: 0,
      reconnectCount: 0,
      errorCount: 0,
      droppedEvents: 0,
      latencyMs: 15,
      staleConnectionMs: 0,
      roomId: 'mock_room_999888',
    };
  }

  get state(): ConnectorState {
    return this._state;
  }

  get telemetry(): ConnectorHealthTelemetry {
    return { ...this._telemetry };
  }

  onEvent(cb: EventCallback): void {
    this.eventCallbacks.push(cb);
  }

  onHealth(cb: HealthCallback): void {
    this.healthCallbacks.push(cb);
  }

  onStateChange(cb: StateChangeCallback): void {
    this.stateCallbacks.push(cb);
  }

  async checkIsLive(): Promise<{ isLive: boolean; roomId?: string }> {
    return { isLive: true, roomId: 'mock_room_999888' };
  }

  async connect(options: ConnectorOptions): Promise<boolean> {
    this.options = options;
    this._state = 'LIVE';
    this._telemetry.state = 'LIVE';
    this._telemetry.connectedAt = new Date().toISOString();
    this.stateCallbacks.forEach((cb) => cb('LIVE', 'OFFLINE'));
    return true;
  }

  async disconnect(): Promise<void> {
    if (this.simulationTimer) {
      clearInterval(this.simulationTimer);
      this.simulationTimer = null;
    }
    const old = this._state;
    this._state = 'OFFLINE';
    this._telemetry.state = 'OFFLINE';
    this.stateCallbacks.forEach((cb) => cb('OFFLINE', old));
  }

  /**
   * Dispatches a deterministic mock event through the connector pipeline
   */
  dispatchMockEvent(event: Partial<LiveEventEnvelope> & { eventType: UniversalEventType; payload: any }) {
    const now = new Date().toISOString();
    const envelope: LiveEventEnvelope = {
      id: event.id || crypto.randomUUID(),
      eventId: event.eventId || `mock:${event.eventType}:${Date.now()}:${Math.random().toString(36).substring(2, 7)}`,
      provider: 'MOCK_TEST_PROVIDER',
      providerVersion: '1.0.0-mock',
      providerEventName: event.providerEventName || event.eventType.toLowerCase(),
      providerEventId: event.providerEventId,
      providerTransactionId: event.providerTransactionId,
      streamerId: this.options?.streamerId || 'mock_streamer_id',
      streamerUsername: this.streamerUsername,
      sessionId: this.options?.sessionId || 'mock_session_id',
      roomId: 'mock_room_999888',
      timestampUtc: now,
      receivedAtUtc: now,
      user: event.user,
      eventType: event.eventType,
      payload: event.payload,
      rawPayload: { mock: true, original: event.payload },
    };

    this._telemetry.totalEventsReceived++;
    this._telemetry.lastEventAt = now;
    this.eventCallbacks.forEach((cb) => cb(envelope));
  }
}
