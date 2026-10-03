import { LiveEventEnvelope } from '@aep/event-model';

export type ConnectorState =
  | 'OFFLINE'
  | 'DISCOVERING'
  | 'CONNECTING'
  | 'CONNECTED'
  | 'LIVE'
  | 'RECONNECTING'
  | 'DEGRADED'
  | 'ENDED'
  | 'ERROR';

export interface ConnectorHealthTelemetry {
  streamerUsername: string;
  state: ConnectorState;
  websocketState?: 'CONNECTING' | 'OPEN' | 'CLOSING' | 'CLOSED';
  roomId?: string;
  connectedAt?: string;
  lastEventAt?: string;
  lastEvent?: string;
  lastEventType?: string;
  lastHeartbeat?: string;
  lastReconnect?: string;
  eventsPerSec: number;
  totalEventsReceived: number;
  reconnectCount: number;
  errorCount: number;
  droppedEvents: number;
  latencyMs: number;
  staleConnectionMs: number;
  lastError?: string;
}

export interface ConnectorOptions {
  enableExtendedGiftInfo?: boolean;
  requestPollingIntervalMs?: number;
  sessionId: string;
  streamerId: string;
  clientParams?: Record<string, unknown>;
}

export type EventCallback = (event: LiveEventEnvelope) => void;
export type HealthCallback = (telemetry: ConnectorHealthTelemetry) => void;
export type StateChangeCallback = (newState: ConnectorState, oldState: ConnectorState) => void;
