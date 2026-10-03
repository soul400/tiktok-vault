import { Server as SocketIOServer } from 'socket.io';
import { LiveEventEnvelope, UniversalEventType } from '@aep/event-model';
import { Logger } from '@aep/shared';

export class SocketGateway {
  private io: SocketIOServer;
  private logger = new Logger('SocketGateway');

  // Throttling buffers for high-volume events (likes, viewers)
  private likeThrottleBuffer = new Map<string, { total: number; count: number }>();
  private viewerThrottleBuffer = new Map<string, number>();
  private throttleInterval: NodeJS.Timeout | null = null;

  constructor(ioServer: SocketIOServer) {
    this.io = ioServer;
    this.setupSocketEvents();
    this.startThrottleFlusher();
  }

  private setupSocketEvents() {
    this.io.on('connection', (socket) => {
      this.logger.info(`Client connected: ${socket.id}`);

      // Client joins a streamer's real-time room
      socket.on('join:stream', (streamerId: string) => {
        socket.join(`stream:${streamerId}`);
        this.logger.debug(`Socket ${socket.id} joined room stream:${streamerId}`);
      });

      socket.on('leave:stream', (streamerId: string) => {
        socket.leave(`stream:${streamerId}`);
      });

      socket.on('disconnect', (reason) => {
        this.logger.info(`Client disconnected: ${socket.id} (reason: ${reason})`);
      });
    });
  }

  private startThrottleFlusher() {
    this.throttleInterval = setInterval(() => {
      // Flush aggregated likes
      for (const [streamerId, data] of this.likeThrottleBuffer.entries()) {
        if (data.count > 0) {
          const payload = {
            streamerId,
            likeCount: data.count,
            totalLikes: data.total,
            timestamp: new Date().toISOString(),
          };
          this.io.to(`stream:${streamerId}`).emit('live:like', payload);
          this.io.emit('live:like', payload);
        }
      }
      this.likeThrottleBuffer.clear();

      // Flush latest viewer count
      for (const [streamerId, viewerCount] of this.viewerThrottleBuffer.entries()) {
        const payload = {
          streamerId,
          viewerCount,
          timestamp: new Date().toISOString(),
        };
        this.io.to(`stream:${streamerId}`).emit('live:viewer', payload);
        this.io.emit('live:viewer', payload);
      }
      this.viewerThrottleBuffer.clear();
    }, 1000);
  }

  /**
   * Dispatches normalized LiveEvent to the streamer's room and globally.
   * Ensures instant delivery without room ID mismatches.
   */
  dispatchLiveEvent(event: LiveEventEnvelope) {
    const room = `stream:${event.streamerId}`;

    // Emit general event both to room and globally
    this.io.to(room).emit('live:event', event);
    this.io.emit('live:event', event);

    switch (event.eventType) {
      case UniversalEventType.CHAT_COMMENT: {
        const commentData = {
          id: event.id,
          streamerId: event.streamerId,
          streamerUsername: event.streamerUsername,
          user: event.user,
          payload: event.payload,
          timestamp: event.timestampUtc,
        };
        this.io.to(room).emit('live:comment', commentData);
        this.io.emit('live:comment', commentData);
        break;
      }

      case UniversalEventType.GIFT_RECEIVED: {
        const giftData = {
          id: event.id,
          streamerId: event.streamerId,
          streamerUsername: event.streamerUsername,
          user: event.user,
          payload: event.payload,
          timestamp: event.timestampUtc,
        };
        this.io.to(room).emit('live:gift', giftData);
        this.io.emit('live:gift', giftData);
        break;
      }

      case UniversalEventType.LIKE_BURST:
        const likePayload = event.payload as any;
        const current = this.likeThrottleBuffer.get(event.streamerId) || { total: 0, count: 0 };
        current.count += likePayload.likeCount || 1;
        current.total = likePayload.totalLikes || current.total;
        this.likeThrottleBuffer.set(event.streamerId, current);
        break;

      case UniversalEventType.VIEWER_COUNT_UPDATE:
        const viewerPayload = event.payload as any;
        this.viewerThrottleBuffer.set(event.streamerId, viewerPayload.viewerCount);
        break;

      case UniversalEventType.BATTLE_START:
        this.io.to(room).emit('battle:start', event.payload);
        this.io.emit('battle:start', event.payload);
        break;

      case UniversalEventType.BATTLE_ARMIES_UPDATE:
        this.io.to(room).emit('battle:update', event.payload);
        this.io.emit('battle:update', event.payload);
        break;

      case UniversalEventType.BATTLE_END:
        this.io.to(room).emit('battle:end', event.payload);
        this.io.emit('battle:end', event.payload);
        break;

      case UniversalEventType.POWERUP_ACQUIRED:
        this.io.to(room).emit('powerup:acquired', {
          user: event.user,
          payload: event.payload,
          timestamp: event.timestampUtc,
        });
        this.io.emit('powerup:acquired', {
          user: event.user,
          payload: event.payload,
          timestamp: event.timestampUtc,
        });
        // Alerts are global since operator might not be in the room
        this.io.emit('alerts:powerup', {
          type: 'ACQUIRED',
          user: event.user,
          payload: event.payload,
          streamerUsername: event.streamerUsername,
          timestamp: event.timestampUtc,
        });
        break;

      case UniversalEventType.POWERUP_USED:
        this.io.to(room).emit('powerup:used', {
          user: event.user,
          payload: event.payload,
          timestamp: event.timestampUtc,
        });
        this.io.emit('powerup:used', {
          user: event.user,
          payload: event.payload,
          timestamp: event.timestampUtc,
        });
        // Alerts are global since operator might not be in the room
        this.io.emit('alerts:powerup', {
          type: 'USED',
          user: event.user,
          payload: event.payload,
          streamerUsername: event.streamerUsername,
          timestamp: event.timestampUtc,
        });
        break;

      case UniversalEventType.STREAM_ENDED:
        this.io.to(room).emit('stream:ended', {
          streamerId: event.streamerId,
          timestamp: event.timestampUtc,
        });
        this.io.emit('stream:ended', {
          streamerId: event.streamerId,
          timestamp: event.timestampUtc,
        });
        break;

      default:
        break;
    }
  }

  broadcastTelemetry(telemetry: any) {
    this.io.emit('telemetry:health', telemetry);
  }

  emitWatchlistAlert(alert: {
    user: any;
    streamerUsername: string;
    eventType: string;
    payload: any;
    rule: any;
    timestamp: string;
  }) {
    this.logger.info(`Broadcasting Watchlist Alert for @${alert.user?.uniqueId}`);
    this.io.emit('alerts:watchlist', alert);
  }

  destroy() {
    if (this.throttleInterval) {
      clearInterval(this.throttleInterval);
      this.throttleInterval = null;
    }
  }
}
