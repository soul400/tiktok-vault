import { PrismaClient } from '@aep/database';
import { Logger } from '@aep/shared';
import { ITikTokLiveConnector } from './adapter.interface.js';
import { TikTokLiveConnectorAdapter } from './tiktok-live.adapter.js';
import { MockTikTokLiveConnectorAdapter } from './mock.adapter.js';
import { LiveEventEnvelope } from '@aep/event-model';

import { ConnectorHealthTelemetry } from './types.js';

export type PipelineEventDispatcher = (event: LiveEventEnvelope) => Promise<void> | void;
export type HealthDispatcher = (telemetry: ConnectorHealthTelemetry) => void;

export class StreamerSupervisor {
  private prisma: PrismaClient;
  private logger = new Logger('StreamerSupervisor');
  private activeConnectors = new Map<string, ITikTokLiveConnector>();
  private activeSessionIds = new Map<string, string>();
  private pollIntervals = new Map<string, NodeJS.Timeout>();
  private eventDispatcher?: PipelineEventDispatcher;
  private healthDispatcher?: HealthDispatcher;
  private useMock: boolean;

  constructor(prisma: PrismaClient, useMock = false) {
    this.prisma = prisma;
    this.useMock = useMock;
  }

  setDispatcher(dispatcher: PipelineEventDispatcher) {
    this.eventDispatcher = dispatcher;
  }

  setHealthDispatcher(dispatcher: HealthDispatcher) {
    this.healthDispatcher = dispatcher;
  }

  /**
   * Starts monitoring a streamer by database ID or creates one
   */
  async startMonitoring(streamerUsername: string): Promise<any> {
    const cleanUsername = streamerUsername.replace(/^@/, '').trim();
    this.logger.info(`Starting supervisor for @${cleanUsername}`);

    // Upsert tracked streamer
    const streamer = await this.prisma.trackedStreamer.upsert({
      where: { username: cleanUsername },
      update: { monitoringEnabled: true },
      create: {
        username: cleanUsername,
        uniqueId: cleanUsername,
        monitoringEnabled: true,
        status: 'CONNECTING',
      },
    });

    // Check if already monitored
    if (this.activeConnectors.has(streamer.id)) {
      this.logger.warn(`Streamer @${cleanUsername} is already being monitored.`);
      return streamer;
    }

    // Instantiate connector adapter
    const connector: ITikTokLiveConnector = this.useMock
      ? new MockTikTokLiveConnectorAdapter(cleanUsername)
      : new TikTokLiveConnectorAdapter(cleanUsername);

    this.activeConnectors.set(streamer.id, connector);

    // Hook event stream once per connector
    connector.onEvent(async (envelope) => {
      const sessionId = this.activeSessionIds.get(streamer.id);
      envelope.streamerId = streamer.id;
      if (sessionId) envelope.sessionId = sessionId;
      if (this.eventDispatcher) {
        await this.eventDispatcher(envelope);
      }
    });

    // Hook state changes once per connector
    connector.onStateChange(async (newState) => {
      if (newState === 'OFFLINE' || newState === 'ENDED') {
        await this.finalizeSession(streamer.id);
      }
    });

    // Hook health telemetry once per connector
    connector.onHealth((telemetry) => {
      if (this.healthDispatcher) {
        this.healthDispatcher(telemetry);
      }
    });

    // Initial check
    await this.checkAndConnect(streamer.id, cleanUsername, connector);

    // Setup periodic room check with jitter to prevent thundering herd
    // When OFFLINE: check every 30s + random jitter (0-5s)
    // When ENDED: check every 60s + random jitter (0-10s)
    // When ERROR: check every 15s + random jitter (0-3s)
    const pollTick = async () => {
      if (connector.state === 'OFFLINE' || connector.state === 'ENDED' || connector.state === 'ERROR') {
        const baseMs = connector.state === 'ERROR' ? 15000 : connector.state === 'ENDED' ? 60000 : 30000;
        const jitter = Math.floor(Math.random() * (baseMs * 0.15));
        const delay = baseMs + jitter;

        const timer = setTimeout(async () => {
          await this.checkAndConnect(streamer.id, cleanUsername, connector);
          // Re-schedule if still monitoring
          if (this.activeConnectors.has(streamer.id)) {
            pollTick();
          }
        }, delay);
        this.pollIntervals.set(streamer.id, timer);
      } else {
        // Connected/live - check less frequently (every 60s) in case state desync
        const timer = setTimeout(async () => {
          if (this.activeConnectors.has(streamer.id)) {
            pollTick();
          }
        }, 60000);
        this.pollIntervals.set(streamer.id, timer);
      }
    };

    pollTick();
    return streamer;
  }

  private async checkAndConnect(streamerId: string, username: string, connector: ITikTokLiveConnector) {
    if (connector.state === 'LIVE' || connector.state === 'CONNECTED' || connector.state === 'CONNECTING') {
      return;
    }

    this.logger.info(`Checking live status for @${username}...`);
    const { isLive, roomId } = await connector.checkIsLive();

    if (isLive) {
      this.logger.info(`LIVE DETECTED for @${username}! Room: ${roomId || 'unknown'}`);

      // Check if there is already an ACTIVE session for this streamer
      let sessionId = this.activeSessionIds.get(streamerId);
      if (!sessionId) {
        let session = await this.prisma.liveSession.findFirst({
          where: { streamerId, status: 'ACTIVE' },
          orderBy: { startedAtUtc: 'desc' },
        });

        if (!session) {
          session = await this.prisma.liveSession.create({
            data: {
              streamerId,
              roomId: roomId || 'unknown_room',
              status: 'ACTIVE',
              startedAtUtc: new Date(),
            },
          });
        }
        sessionId = session.id;
        this.activeSessionIds.set(streamerId, sessionId);
      }

      // Update streamer state
      await this.prisma.trackedStreamer.update({
        where: { id: streamerId },
        data: { status: 'LIVE', lastLiveAt: new Date() },
      });

      // Connect
      const connected = await connector.connect({
        sessionId,
        streamerId,
      });

      if (!connected) {
        this.logger.warn(`Could not connect to live stream for @${username}`);
        await this.prisma.trackedStreamer.update({
          where: { id: streamerId },
          data: { status: connector.state === 'OFFLINE' ? 'OFFLINE' : 'ERROR' },
        });
      }
    } else {
      this.logger.info(`@${username} is currently OFFLINE.`);
      if (this.activeSessionIds.has(streamerId)) {
        await this.finalizeSession(streamerId);
      }
      await this.prisma.trackedStreamer.update({
        where: { id: streamerId },
        data: { status: 'OFFLINE', lastOfflineAt: new Date() },
      });
    }
  }

  async finalizeSession(streamerId: string) {
    const sessionId = this.activeSessionIds.get(streamerId);
    if (!sessionId) return;

    this.logger.info(`Finalizing session ${sessionId} for streamer ${streamerId}`);

    const session = await this.prisma.liveSession.findUnique({
      where: { id: sessionId },
    });

    if (session) {
      const now = new Date();
      const duration = Math.floor((now.getTime() - session.startedAtUtc.getTime()) / 1000);

      await this.prisma.liveSession.update({
        where: { id: sessionId },
        data: {
          status: 'ENDED',
          endedAtUtc: now,
          durationSeconds: duration,
        },
      });

      await this.prisma.trackedStreamer.update({
        where: { id: streamerId },
        data: { status: 'OFFLINE', lastOfflineAt: now },
      });
    }

    this.activeSessionIds.delete(streamerId);
  }

  async stopMonitoring(streamerId: string) {
    const timer = this.pollIntervals.get(streamerId);
    if (timer) {
      clearTimeout(timer);
      this.pollIntervals.delete(streamerId);
    }

    const connector = this.activeConnectors.get(streamerId);
    if (connector) {
      await connector.disconnect();
      this.activeConnectors.delete(streamerId);
    }

    await this.finalizeSession(streamerId);

    await this.prisma.trackedStreamer.update({
      where: { id: streamerId },
      data: { monitoringEnabled: false, status: 'OFFLINE' },
    });
  }

  getConnector(streamerId: string): ITikTokLiveConnector | undefined {
    return this.activeConnectors.get(streamerId);
  }

  getAllMonitoredStreamers(): Array<{ streamerId: string; connector: ITikTokLiveConnector }> {
    return Array.from(this.activeConnectors.entries()).map(([streamerId, connector]) => ({
      streamerId,
      connector,
    }));
  }
}
