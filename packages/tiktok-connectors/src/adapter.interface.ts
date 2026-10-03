import {
  ConnectorState,
  ConnectorHealthTelemetry,
  ConnectorOptions,
  EventCallback,
  HealthCallback,
  StateChangeCallback,
} from './types.js';

export interface ITikTokLiveConnector {
  readonly streamerUsername: string;
  readonly state: ConnectorState;
  readonly telemetry: ConnectorHealthTelemetry;

  connect(options: ConnectorOptions): Promise<boolean>;
  disconnect(): Promise<void>;
  checkIsLive(): Promise<{ isLive: boolean; roomId?: string }>;

  onEvent(callback: EventCallback): void;
  onHealth(callback: HealthCallback): void;
  onStateChange(callback: StateChangeCallback): void;
}
