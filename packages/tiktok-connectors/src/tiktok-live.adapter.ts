import { TikTokLiveConnection, RouteConfig } from 'tiktok-live-connector';
import {
  LiveEventEnvelope,
  UniversalEventType,
  UniversalUserSnapshot,
  ChatCommentPayload,
  LikeBurstPayload,
  GiftReceivedPayload,
  ViewerCountPayload,
  PowerUpEventPayload,
  BattleStartPayload,
  BattleUpdatePayload,
  BattleEndPayload,
  BattleParticipantSnapshot,
} from '@aep/event-model';
import { resolveCanonicalBattleTeams, CanonicalBattleAssignmentOutput } from '@aep/battle-intelligence';
import { LikeAccumulator, GiftStreakTracker } from '@aep/event-pipeline';
import { Logger } from '@aep/shared';
import { ITikTokLiveConnector } from './adapter.interface.js';
import {
  ConnectorState,
  ConnectorHealthTelemetry,
  ConnectorOptions,
  EventCallback,
  HealthCallback,
  StateChangeCallback,
} from './types.js';

// Safe stub for room gifts to bypass EulerStream commercial signing requirements
(RouteConfig as any).fetchRoomGifts = async () => [];

export class TikTokLiveConnectorAdapter implements ITikTokLiveConnector {
  public readonly streamerUsername: string;
  private connection: any = null;
  private _state: ConnectorState = 'OFFLINE';
  private logger: Logger;
  private options?: ConnectorOptions;

  private eventCallbacks: EventCallback[] = [];
  private healthCallbacks: HealthCallback[] = [];
  private stateCallbacks: StateChangeCallback[] = [];

  private likeAccumulator = new LikeAccumulator();
  private giftStreakTracker = new GiftStreakTracker();

  private _telemetry: ConnectorHealthTelemetry;
  private eventCountWindow = 0;
  private telemetryIntervalTimer: NodeJS.Timeout | null = null;
  private reconnectAttempt = 0;
  private maxReconnectAttempts = 8;

  // Heartbeat watchdog: detect stale connections where WebSocket is open but no events flow
  private heartbeatWatchdogTimer: NodeJS.Timeout | null = null;
  private lastEventReceivedAt: number = Date.now();
  private static readonly STALE_CONNECTION_THRESHOLD_MS = 45_000; // 45s without any event = stale
  private static readonly HEARTBEAT_CHECK_INTERVAL_MS = 10_000; // Check every 10s

  // Room ID caching for reconnect invalidation
  private cachedRoomId: string | undefined;
  private consecutiveStaleDetections = 0;

  private lastBattleScores = new Map<string, { teamAScore: number; teamBScore: number }>();
  private canonicalBattleAssignments = new Map<string, CanonicalBattleAssignmentOutput>();
  private streamerUserId?: string;

  public setStreamerUserId(userId: string): void {
    this.streamerUserId = userId;
  }

  private currentBattleHosts?: {
    hostAnchorId?: string;
    hostInfo: BattleParticipantSnapshot;
    rivalAnchorId?: string;
    rivalInfo: BattleParticipantSnapshot;
    teamAHosts?: BattleParticipantSnapshot[];
    teamBHosts?: BattleParticipantSnapshot[];
    battleId?: string;
  };

  constructor(streamerUsername: string) {
    this.streamerUsername = streamerUsername.replace(/^@/, '');
    this.logger = new Logger(`TikTokConnector:${this.streamerUsername}`);

    this._telemetry = {
      streamerUsername: this.streamerUsername,
      state: 'OFFLINE',
      websocketState: 'CLOSED',
      eventsPerSec: 0,
      totalEventsReceived: 0,
      reconnectCount: 0,
      errorCount: 0,
      droppedEvents: 0,
      latencyMs: 0,
      staleConnectionMs: 0,
      lastHeartbeat: new Date().toISOString(),
    };
  }

  get state(): ConnectorState {
    return this._state;
  }

  get telemetry(): ConnectorHealthTelemetry {
    return { ...this._telemetry };
  }

  get roomId(): string | undefined {
    return this._telemetry.roomId || this.connection?.roomId;
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

  private setState(newState: ConnectorState) {
    const oldState = this._state;
    if (oldState !== newState) {
      this._state = newState;
      this._telemetry.state = newState;
      this.logger.info(`State changed from ${oldState} -> ${newState}`);
      this.stateCallbacks.forEach((cb) => cb(newState, oldState));
    }
  }

  async checkIsLive(): Promise<{ isLive: boolean; roomId?: string }> {
    try {
      const probe: any = new (TikTokLiveConnection as any)(this.streamerUsername, {});
      const isLive = await probe.fetchIsLive();
      let roomId: string | undefined = undefined;
      if (isLive) {
        try {
          roomId = String(await probe.fetchRoomId());
        } catch {
          // ignore
        }
      }
      return {
        isLive: Boolean(isLive),
        roomId,
      };
    } catch (err: any) {
      this.logger.debug(`Probe check error: ${err.message}`);
      return { isLive: false };
    }
  }

  async connect(options: ConnectorOptions): Promise<boolean> {
    this.options = options;
    this.setState('CONNECTING');
    this._telemetry.websocketState = 'CONNECTING';

    try {
      if (this.connection) {
        try {
          await this.connection.disconnect();
        } catch (_) {}
        this.connection = null;
      }

      this.connection = new (TikTokLiveConnection as any)(this.streamerUsername, {
        processInitialData: true,
        enableExtendedGiftInfo: options.enableExtendedGiftInfo ?? false,
        fetchRoomInfoOnConnect: true,
        requestPollingIntervalMs: options.requestPollingIntervalMs ?? 1000,
        requestHeaders: {
          'Accept-Language': 'en-US,en;q=0.9',
        },
      } as any);

      this.setupListeners();

      const connectStart = Date.now();
      const state = await this.connection.connect();
      const connectLatency = Date.now() - connectStart;
      
      this._telemetry.roomId = this.connection.roomId || state?.roomId;
      this._telemetry.connectedAt = new Date().toISOString();
      this._telemetry.websocketState = 'OPEN';
      this._telemetry.lastHeartbeat = new Date().toISOString();
      this._telemetry.latencyMs = connectLatency;
      this.cachedRoomId = this._telemetry.roomId;
      if (this.connection?.roomInfo?.owner) {
        const owner = this.connection.roomInfo.owner;
        const oId = String(owner.id_str || owner.id || '');
        if (oId) this.streamerUserId = oId;
      } else if (state?.roomInfo?.owner) {
        const owner = state.roomInfo.owner;
        const oId = String(owner.id_str || owner.id || '');
        if (oId) this.streamerUserId = oId;
      }
      this.lastEventReceivedAt = Date.now();
      this.consecutiveStaleDetections = 0;
      this.setState('CONNECTED');
      this.startTelemetryLoop();
      this.startHeartbeatWatchdog();
      this.reconnectAttempt = 0;

      this.logger.info(`Connected to @${this.streamerUsername} (room: ${this._telemetry.roomId}, latency: ${connectLatency}ms)`);

      return true;
    } catch (err: any) {
      this.logger.error(`Failed to connect: ${err.message}`);
      this._telemetry.lastError = err.message;
      this._telemetry.errorCount = (this._telemetry.errorCount || 0) + 1;
      this._telemetry.websocketState = 'CLOSED';
      if (err.name === 'UserOfflineError' || err.message?.includes('online') || err.message?.includes('offline')) {
        this.setState('OFFLINE');
      } else {
        this.setState('ERROR');
      }
      return false;
    }
  }

  async disconnect(): Promise<void> {
    this.stopHeartbeatWatchdog();

    if (this.telemetryIntervalTimer) {
      clearInterval(this.telemetryIntervalTimer);
      this.telemetryIntervalTimer = null;
    }

    if (this.connection) {
      try {
        await this.connection.disconnect();
      } catch (err: any) {
        this.logger.warn(`Error during disconnect: ${err.message}`);
      }
      this.connection = null;
    }

    this._telemetry.websocketState = 'CLOSED';
    this.setState('OFFLINE');
  }

  private startTelemetryLoop() {
    if (this.telemetryIntervalTimer) clearInterval(this.telemetryIntervalTimer);

    this.telemetryIntervalTimer = setInterval(() => {
      this._telemetry.eventsPerSec = this.eventCountWindow;
      this.eventCountWindow = 0;
      this._telemetry.lastHeartbeat = new Date().toISOString();

      // Track stale connection duration
      const timeSinceLastEvent = Date.now() - this.lastEventReceivedAt;
      this._telemetry.staleConnectionMs = this._state === 'CONNECTED' ? timeSinceLastEvent : 0;

      this.healthCallbacks.forEach((cb) => cb(this.telemetry));
    }, 1000);
  }

  /**
   * Heartbeat watchdog: Detects stale connections where the WebSocket remains open
   * but TikTok stops sending events (common after TikTok edge cluster rotations).
   * If no event is received within STALE_CONNECTION_THRESHOLD_MS, force-reconnects.
   */
  private startHeartbeatWatchdog() {
    this.stopHeartbeatWatchdog();

    this.heartbeatWatchdogTimer = setInterval(() => {
      if (this._state !== 'CONNECTED') return;

      const timeSinceLastEvent = Date.now() - this.lastEventReceivedAt;

      if (timeSinceLastEvent > TikTokLiveConnectorAdapter.STALE_CONNECTION_THRESHOLD_MS) {
        this.consecutiveStaleDetections++;
        this.logger.warn(
          `Stale connection detected: no events for ${Math.round(timeSinceLastEvent / 1000)}s ` +
          `(consecutive: ${this.consecutiveStaleDetections})`
        );

        if (this.consecutiveStaleDetections >= 2) {
          // After 2 consecutive stale detections (~90s), force reconnect with room invalidation
          this.logger.warn('Force-reconnecting due to persistent stale connection...');
          this.cachedRoomId = undefined; // Invalidate cached room ID
          this.forceReconnect('STALE_CONNECTION');
        }
      } else {
        this.consecutiveStaleDetections = 0;
      }
    }, TikTokLiveConnectorAdapter.HEARTBEAT_CHECK_INTERVAL_MS);
  }

  private stopHeartbeatWatchdog() {
    if (this.heartbeatWatchdogTimer) {
      clearInterval(this.heartbeatWatchdogTimer);
      this.heartbeatWatchdogTimer = null;
    }
  }

  /**
   * Force-reconnect: Tears down current connection and triggers reconnect flow.
   * Used by heartbeat watchdog and close-code classification.
   */
  private async forceReconnect(reason: string) {
    this.logger.info(`Force reconnect triggered: ${reason}`);
    this.stopHeartbeatWatchdog();

    if (this.connection) {
      try {
        await this.connection.disconnect();
      } catch (_) {}
      this.connection = null;
    }

    this._telemetry.websocketState = 'CLOSED';
    this.handleReconnect(reason);
  }

  private emitNormalized(
    eventType: UniversalEventType,
    providerEventName: string,
    payload: any,
    user?: UniversalUserSnapshot,
    providerEventId?: string,
    providerTransactionId?: string,
    raw?: any
  ) {
    this.eventCountWindow++;
    this._telemetry.totalEventsReceived++;
    this.lastEventReceivedAt = Date.now();
    const now = new Date().toISOString();
    this._telemetry.lastEventAt = now;
    this._telemetry.lastEvent = providerEventName;
    this._telemetry.lastEventType = eventType;
    this._telemetry.lastHeartbeat = now;

    const deterministicKey =
      providerTransactionId ||
      providerEventId ||
      `${eventType}:${this.streamerUsername}:${user?.userId || 'sys'}:${Date.now()}:${Math.random().toString(36).substring(2, 8)}`;

    const envelope: LiveEventEnvelope = {
      id: crypto.randomUUID(),
      eventId: deterministicKey,
      provider: 'TIKTOK_LIVE_CONNECTOR',
      providerVersion: '2.5.0',
      providerEventName,
      providerEventId,
      providerTransactionId,
      streamerId: this.options?.streamerId || '',
      streamerUsername: this.streamerUsername,
      sessionId: this.options?.sessionId || '',
      roomId: this._telemetry.roomId || '',
      timestampUtc: now,
      receivedAtUtc: now,
      user,
      eventType,
      payload,
      rawPayload: raw,
    };

    this.eventCallbacks.forEach((cb) => cb(envelope));
  }

  private extractUser(data: any): UniversalUserSnapshot | undefined {
    if (!data) return undefined;
    const u = data.user || data.userDetails || data;
    const userId = u.id || u.idStr || u.userId || u.user_id || data.userId;
    const uniqueId = u.displayId || u.uniqueId || (u.user && u.user.unique_id) || userId;
    const nickname = u.nickname || (u.userDetails && u.userDetails.nickname) || uniqueId || 'Unknown';

    if (!userId && !uniqueId) return undefined;

    const avatar =
      u.avatarThumb?.urlList?.[0] ||
      u.profilePictureUrl ||
      (u.userDetails && u.userDetails.profilePictureUrls?.[0]) ||
      undefined;

    // Badges extraction from TikTok protobuf badgeList
    const rawBadges = Array.isArray(u.badgeList) ? u.badgeList : [];
    const badges = rawBadges.map((b: any) => {
      const levelStr = b.privilegeLogExtra?.level || b.combine?.str;
      const levelNum = levelStr && !isNaN(Number(levelStr)) ? Number(levelStr) : undefined;
      const badgeName =
        b.combine?.str || (b.sceneType === 8 ? 'VIP Grade' : b.sceneType === 10 ? 'Fans Team' : 'Badge');
      return {
        id: b.privilegeLogExtra?.privilegeId || String(b.sceneType || ''),
        name: badgeName,
        type: b.sceneType === 8 ? 'VIP_GRADE' : b.sceneType === 10 ? 'FANS_TEAM' : 'BADGE',
        level: levelNum,
      };
    });

    // Moderator & Subscriber status from userAttr and userIdentity
    const isModerator = Boolean(
      u.userAttr?.isAdmin ||
      u.userAttr?.isSuperAdmin ||
      u.userAttr?.isChannelAdmin ||
      data.userIdentity?.isModeratorOfAnchor ||
      u.userIdentity?.isModeratorOfAnchor
    );

    const isSubscriber = Boolean(
      u.isSubscribe ||
      data.userIdentity?.isSubscriberOfAnchor ||
      u.userIdentity?.isSubscriberOfAnchor
    );

    return {
      userId: String(userId || uniqueId),
      uniqueId: String(uniqueId || userId),
      nickname: String(nickname),
      avatarUrl: avatar,
      secUid: u.secUid,
      badges: badges.length > 0 ? badges : undefined,
      isModerator: isModerator || undefined,
      isSubscriber: isSubscriber || undefined,
    };
  }

  private setupListeners() {
    if (!this.connection) return;

    // Chat / Comments
    this.connection.on('chat', (data: any) => {
      const user = this.extractUser(data);
      const text = data.content || data.comment || '';
      const msgId = data.common?.msgId || data.msgId || String(data.createTime || Date.now());
      const payload: ChatCommentPayload = {
        commentId: String(msgId),
        text: String(text),
      };
      this.emitNormalized(
        UniversalEventType.CHAT_COMMENT,
        'chat',
        payload,
        user,
        String(msgId),
        undefined,
        data
      );
    });

    // Gifts
    this.connection.on('gift', (data: any) => {
      const user = this.extractUser(data);
      const repeatCount = data.repeatCount || data.comboCount || 1;
      const diamondCost = data.diamondCount || data.giftDetails?.diamondCount || data.gift?.diamondCount || 0;
      const giftName = data.giftName || data.giftDetails?.giftName || data.gift?.name || 'Gift';
      const msgId = data.common?.msgId || data.msgId || String(Date.now());
      const repeatEnd = Boolean(data.repeatEnd);
      const comboId = data.groupId ? String(data.groupId) : undefined;
      const userId = user?.userId || 'anon';

      const tracked = this.giftStreakTracker.processGift({
        userId,
        giftId: String(data.giftId || data.gift?.id || '0'),
        diamondCost,
        repeatCount,
        repeatEnd,
        comboId,
        msgId: String(msgId),
      });

      const payload: GiftReceivedPayload = {
        giftId: String(data.giftId || data.gift?.id || '0'),
        giftName: String(giftName),
        diamondCost,
        repeatCount: tracked.deltaCount,
        totalDiamonds: tracked.deltaDiamonds,
        comboId,
        giftIconUrl: data.giftPictureUrl || data.gift?.image?.urlList?.[0],
        receiverUserId: data.receiverUserId ? String(data.receiverUserId) : undefined,
      };

      this.emitNormalized(
        UniversalEventType.GIFT_RECEIVED,
        'gift',
        payload,
        user,
        String(msgId),
        tracked.transactionId,
        data
      );
    });

    // Likes
    this.connection.on('like', (data: any) => {
      const user = this.extractUser(data);
      const reportedCount = data.likeCount || data.count || 1;
      const reportedTotal = data.totalLikeCount || data.total;
      const sessionId = this.options?.sessionId || 'default';
      const userId = user?.userId || 'anon';

      const accumulated = this.likeAccumulator.process(
        sessionId,
        userId,
        reportedCount,
        reportedTotal
      );

      const payload: LikeBurstPayload = {
        likeCount: accumulated.likeCount,
        totalLikes: accumulated.totalLikes,
      };
      const msgId = data.common?.msgId || data.msgId;
      this.emitNormalized(
        UniversalEventType.LIKE_BURST,
        'like',
        payload,
        user,
        msgId ? String(msgId) : undefined,
        undefined,
        data
      );
    });

    // Shares
    this.connection.on('share', (data: any) => {
      const user = this.extractUser(data);
      this.emitNormalized(
        UniversalEventType.SHARE,
        'share',
        { shareCount: 1 },
        user,
        data.msgId,
        undefined,
        data
      );
    });

    // Follows
    this.connection.on('follow', (data: any) => {
      const user = this.extractUser(data);
      this.emitNormalized(
        UniversalEventType.FOLLOW,
        'follow',
        { followTimeUtc: new Date().toISOString() },
        user,
        data.msgId,
        undefined,
        data
      );
    });

    // Joins
    this.connection.on('member', (data: any) => {
      const user = this.extractUser(data);
      this.emitNormalized(
        UniversalEventType.USER_JOIN,
        'member',
        { userCount: 1 },
        user,
        data.msgId,
        undefined,
        data
      );
    });

    // Room Viewer updates
    this.connection.on('roomUser', (data: any) => {
      const viewerCount = Number(data.totalUser || data.total || data.viewerCount || 0);
      const payload: ViewerCountPayload = {
        viewerCount,
      };
      this.emitNormalized(
        UniversalEventType.VIEWER_COUNT_UPDATE,
        'roomUser',
        payload,
        undefined,
        undefined,
        undefined,
        data
      );
    });

    // Battle / PK / battleItemCard Handling (Evidence-Based)
    this.connection.on('linkMicBattle', (data: any) => {
      const defaultHost: BattleParticipantSnapshot = {
        userId: String(this.roomId || ''),
        uniqueId: this.streamerUsername,
        nickname: this.streamerUsername,
        avatarUrl: '',
      };

      const rawAnchors = data.anchorsInfo || data.anchors || data.battleSetting?.teams || [];
      const anchorsList: any[] = Array.isArray(rawAnchors)
        ? rawAnchors
        : typeof rawAnchors === 'object' && rawAnchors !== null
          ? Object.entries(rawAnchors).map(([k, v]: [string, any]) => ({ key: k, value: v }))
          : [];

      // Parse all participants first
      const parsedParticipants: Array<{
        anchorId: string;
        participant: BattleParticipantSnapshot;
        isCurrentHost: boolean;
        explicitTeam?: 'TEAM_A' | 'TEAM_B';
        originalIndex: number;
      }> = [];

      for (let idx = 0; idx < anchorsList.length; idx++) {
        const a = anchorsList[idx];
        const u = a.value?.user || a.user || a.value || a;
        if (!u) continue;

        const anchorId = String(a.key || u.userId || u.userIdStr || u.id || '');
        const displayId = String(u.displayId || u.uniqueId || '');
        const nickname = String(u.nickName || u.nickname || displayId || '');
        const avatarUrl = u.avatarThumb?.urlList?.[0] || u.avatarThumb?.mUrls?.[0] || u.profilePictureUrl || '';
        const roomId = String(u.roomId || '');

        const isCurrentHost = Boolean(
          (this.streamerUsername && displayId.toLowerCase() === this.streamerUsername.toLowerCase()) ||
          (roomId && this.roomId && roomId === this.roomId)
        );

        const teamVal = a.teamId || a.value?.teamId || a.group || a.value?.group;
        let explicitTeam: 'TEAM_A' | 'TEAM_B' | undefined = undefined;
        if (teamVal === 1 || teamVal === 'TEAM_A' || teamVal === 'team_1') explicitTeam = 'TEAM_A';
        else if (teamVal === 2 || teamVal === 'TEAM_B' || teamVal === 'team_2') explicitTeam = 'TEAM_B';

        parsedParticipants.push({
          anchorId,
          participant: {
            userId: anchorId,
            uniqueId: displayId || (isCurrentHost ? this.streamerUsername : `rival_${idx + 1}`),
            nickname: nickname || displayId || (isCurrentHost ? this.streamerUsername : `منافس ${idx + 1}`),
            avatarUrl,
          },
          isCurrentHost,
          explicitTeam,
          originalIndex: idx,
        });
      }

      // Deterministically resolve Team A and Team B using the canonical engine
      const battleId = String(data.battleId || data.channelId || Date.now());
      const cachedScore = this.lastBattleScores.get(battleId) || { teamAScore: 0, teamBScore: 0 };

      const canonical = resolveCanonicalBattleTeams({
        battleId,
        battleType: data.battleType === 2 || parsedParticipants.length >= 4 ? '2v2' : '1v1',
        trackedStreamer: {
          userId: this.streamerUserId,
          username: this.streamerUsername,
          roomId: this.cachedRoomId || this.roomId,
        },
        participants: parsedParticipants.map((p) => ({
          userId: p.anchorId,
          uniqueId: p.participant.uniqueId,
          nickname: p.participant.nickname,
          avatarUrl: p.participant.avatarUrl,
          sourceTeamId: p.explicitTeam,
          isCurrentHost: p.isCurrentHost,
          sourceIndex: p.originalIndex,
        })),
        sourceTeamUsers: data.teamUsers,
        sourceTeamArmies: data.teamArmies,
        bestTeammateRelation: data.teamMatchCampaign?.bestTeammateRelation,
        previousAssignment: this.canonicalBattleAssignments.get(battleId),
        sourceTeamScores: {
          team1Score: cachedScore.teamAScore,
          team2Score: cachedScore.teamBScore,
        },
      });

      this.canonicalBattleAssignments.set(battleId, canonical);

      const teamAHosts: BattleParticipantSnapshot[] = canonical.teamA.hosts.map((h: any) => ({
        userId: h.userId,
        uniqueId: h.uniqueId,
        nickname: h.nickname,
        avatarUrl: h.avatarUrl,
        score: h.score,
      }));

      const teamBHosts: BattleParticipantSnapshot[] = canonical.teamB.hosts.map((h: any) => ({
        userId: h.userId,
        uniqueId: h.uniqueId,
        nickname: h.nickname,
        avatarUrl: h.avatarUrl,
        score: h.score,
      }));

      this.currentBattleHosts = {
        hostAnchorId: teamAHosts[0]?.userId,
        hostInfo: teamAHosts[0] || defaultHost,
        rivalAnchorId: teamBHosts[0]?.userId,
        rivalInfo: teamBHosts[0],
        teamAHosts,
        teamBHosts,
        battleId,
      };

      const payload: BattleStartPayload = {
        battleId,
        battleType: canonical.battleType,
        teams: [
          {
            teamId: 'TEAM_A',
            score: canonical.teamA.score,
            hosts: teamAHosts,
          },
          {
            teamId: 'TEAM_B',
            score: canonical.teamB.score,
            hosts: teamBHosts,
          },
        ],
        durationSeconds: data.duration || 300,
      };

      this.emitNormalized(
        UniversalEventType.BATTLE_START,
        'linkMicBattle',
        payload,
        undefined,
        battleId,
        undefined,
        data
      );
    });

    this.connection.on('linkMicArmies', (data: any) => {
      try {
        const battleId = String(data.battleId || data.channelId || this.currentBattleHosts?.battleId || '');
        const prevCached = (battleId && this.lastBattleScores.get(battleId)) || { teamAScore: 0, teamBScore: 0 };

        let teamAScore = Number(data.teamAScore !== undefined ? data.teamAScore : prevCached.teamAScore);
        let teamBScore = Number(data.teamBScore !== undefined ? data.teamBScore : prevCached.teamBScore);
        let teamAContributors: any[] = [];
        let teamBContributors: any[] = [];

        const teamAHosts: any[] = this.currentBattleHosts?.teamAHosts || (this.currentBattleHosts?.hostInfo ? [this.currentBattleHosts.hostInfo] : []);
        const teamBHosts: any[] = this.currentBattleHosts?.teamBHosts || (this.currentBattleHosts?.rivalInfo ? [this.currentBattleHosts.rivalInfo] : []);
        const hostAnchorId = this.currentBattleHosts?.hostAnchorId;

        let teamAHostsSum = 0;
        let teamBHostsSum = 0;

        if (data && data.armies) {
          const entries: [string, any][] = Array.isArray(data.armies)
            ? data.armies.map((a: any, i: number) => [String(a.anchorIdStr || a.anchorId || i), a])
            : typeof data.armies === 'object'
              ? Object.entries(data.armies)
              : [];

          entries.forEach(([key, army], idx) => {
            const armyAnchorId = String(army.anchorIdStr || army.anchorId || key);
            const score = Number(
              army.hostscore ||
              army.hostScore ||
              army.points ||
              army.score ||
              army.totalScore ||
              army.totalPoints ||
              army.diamondScore ||
              0
            );

            const rawContributors = army.userArmies || army.participants || army.contributors || [];
            const contributorsList: any[] = Array.isArray(rawContributors)
              ? rawContributors
              : typeof rawContributors === 'object' && rawContributors !== null
                ? Object.values(rawContributors)
                : [];

            const parsedContributors = contributorsList.map((p: any, rank: number) => ({
              userId: String(p.userId || p.userIdStr || ''),
              uniqueId: p.uniqueId || p.nickname || '',
              nickname: p.nickname || '',
              score: Number(p.score || p.diamondScore || 0),
              rank: rank + 1,
              avatarUrl: p.avatarThumb?.urlList?.[0] || p.profilePictureUrl || '',
              isEnigma: Boolean(p.isEnigma),
            }));

            // Determine if this army belongs to Team A or Team B
            const matchesTeamA =
              (hostAnchorId && armyAnchorId === hostAnchorId) ||
              teamAHosts.some((h) => h.userId === armyAnchorId || (h.uniqueId && h.uniqueId === armyAnchorId));
            const matchesTeamB =
              teamBHosts.some((h) => h.userId === armyAnchorId || (h.uniqueId && h.uniqueId === armyAnchorId));

            if (matchesTeamA) {
              teamAHostsSum += score;
              if (parsedContributors.length > 0) {
                teamAContributors = parsedContributors;
              }
              const matchedHost = teamAHosts.find((h) => h.userId === armyAnchorId || h.uniqueId === armyAnchorId);
              if (matchedHost) matchedHost.score = Math.max(Number(matchedHost.score || 0), score);
            } else if (matchesTeamB) {
              teamBHostsSum += score;
              if (parsedContributors.length > 0) {
                teamBContributors = parsedContributors;
              }
              const matchedHost = teamBHosts.find((h) => h.userId === armyAnchorId || h.uniqueId === armyAnchorId);
              if (matchedHost) matchedHost.score = Math.max(Number(matchedHost.score || 0), score);
            }
          });
        }

        // Direct team total scores from protobuf data.teamArmies if present
        if (data && Array.isArray(data.teamArmies) && data.teamArmies.length >= 2) {
          for (const ta of data.teamArmies) {
            const teamTotal = Number(ta.teamTotalScore || ta.totalScore || 0);
            const teamUsersList: any[] = ta.teamUsers || [];
            const isTeamA = teamUsersList.some((u: any) =>
              teamAHosts.some((h: any) => h.userId === String(u.userIdStr || u.userId || ''))
            );
            if (isTeamA) {
              if (teamTotal > 0) teamAScore = Math.max(teamAScore, teamTotal);
              for (const u of teamUsersList) {
                const uid = String(u.userIdStr || u.userId || '');
                const score = Number(u.score || 0);
                const h = teamAHosts.find((x: any) => x.userId === uid);
                if (h && score > 0) h.score = Math.max(Number(h.score || 0), score);
              }
            } else {
              if (teamTotal > 0) teamBScore = Math.max(teamBScore, teamTotal);
              for (const u of teamUsersList) {
                const uid = String(u.userIdStr || u.userId || '');
                const score = Number(u.score || 0);
                const h = teamBHosts.find((x: any) => x.userId === uid);
                if (h && score > 0) h.score = Math.max(Number(h.score || 0), score);
              }
            }
          }
        }

        // Monotonic total team score: never drop lower than individual host sum or previous cached score
        teamAScore = Math.max(teamAScore, teamAHostsSum, prevCached.teamAScore);
        teamBScore = Math.max(teamBScore, teamBHostsSum, prevCached.teamBScore);

        if (battleId) {
          this.lastBattleScores.set(battleId, { teamAScore, teamBScore });
        }

        const teams = [
          {
            teamId: 'TEAM_A',
            score: teamAScore,
            hosts: teamAHosts.length > 0 ? teamAHosts : [this.currentBattleHosts?.hostInfo || { userId: '', uniqueId: this.streamerUsername, nickname: this.streamerUsername }],
            contributors: teamAContributors,
          },
          {
            teamId: 'TEAM_B',
            score: teamBScore,
            hosts: teamBHosts.length > 0 ? teamBHosts : [this.currentBattleHosts?.rivalInfo || { userId: '', uniqueId: 'rival', nickname: 'المنافس' }],
            contributors: teamBContributors,
          },
        ];

        const payload: BattleUpdatePayload = {
          battleId,
          teams,
        };

        this.emitNormalized(
          UniversalEventType.BATTLE_ARMIES_UPDATE,
          'linkMicArmies',
          payload,
          undefined,
          undefined,
          undefined,
          data
        );
      } catch (err: any) {
        this.logger.warn(`Failed to process linkMicArmies: ${err.message}`);
      }
    });

    // Helper for processing Battle Item Card / Power-up events (including Enigma winners)
    const processBattleItemCard = (data: any) => {
      try {
        // 1. Parse all awarded users and their individual quantities
        const awardedUsersRaw = data.awardCardNotice?.awardedUsers || data.awardedUsers || [];
        const awardedUsersList: any[] = Array.isArray(awardedUsersRaw)
          ? awardedUsersRaw
          : typeof awardedUsersRaw === 'object' && awardedUsersRaw !== null
            ? Object.values(awardedUsersRaw)
            : [];

        // Helper to extract numeric quantity across all known protobuf and JSON field variants
        const extractItemQuantity = (obj: any): number => {
          if (!obj || typeof obj !== 'object') return 0;
          const candidates = [
            obj.awardCount,
            obj.awardCardCount,
            obj.cardAmount,
            obj.cardCount,
            obj.count,
            obj.quantity,
            obj.amount,
            obj.cardNum,
            obj.num,
            obj.rewardCount,
            obj.totalCount,
            obj.score,
            obj.card_count,
            obj.card_amount,
            obj.card_num,
            obj.award_count,
            obj.award_card_count,
          ];
          for (const c of candidates) {
            const n = Number(c);
            if (!isNaN(n) && n > 0) return n;
          }
          return 0;
        };

        const notice = data.awardCardNotice || data.cardObtainGuide || {};
        const noticeCount = extractItemQuantity(notice) || extractItemQuantity(data);

        // Helper to parse count from text (e.g., "x2", "عدد 2", "بطاقتين", "2 ضباب")
        const extractCountFromText = (text: string): number => {
          if (!text) return 0;
          if (text.includes('بطاقتين') || text.includes('قفازين') || text.includes('ضبابين') || text.includes('قنبلتين')) {
            return 2;
          }
          const m = text.match(/(?:x|×|\*|\b)(\d+)\s*(?:cards?|items?|بطاق(?:ة|ات)?|قفاز(?:ات)?|ضباب|دخان)?\b/i);
          if (m && m[1]) {
            const val = parseInt(m[1], 10);
            if (val >= 1 && val <= 50) return val;
          }
          return 0;
        };

        const parsedAwarded: Array<{ user: any; count: number }> = [];

        if (awardedUsersList.length > 0) {
          for (const item of awardedUsersList) {
            const u = item?.user || item;
            if (!u) continue;
            const uid = String(u.userId || u.userIdStr || 'enigma_winner');
            const userCount = extractItemQuantity(item) || extractItemQuantity(u);
            const finalItemCount = userCount > 0 ? userCount : (noticeCount > 0 ? noticeCount : 1);

            const existing = parsedAwarded.find((p) => p.user.userId === uid);
            if (existing) {
              existing.count += finalItemCount;
            } else {
              parsedAwarded.push({
                user: {
                  userId: uid,
                  uniqueId: u.displayId || u.uniqueId || u.nickName || 'Enigma',
                  nickname: u.nickName || u.nickname || u.displayId || 'داعم متخفي (Enigma)',
                  avatarUrl: u.avatarThumb?.urlList?.[0] || u.avatarThumb?.mUrls?.[0] || '',
                },
                count: finalItemCount,
              });
            }
          }
        }

        let winnerUser: any = parsedAwarded[0]?.user || null;

        // 2. Try usage card sendUser
        if (!winnerUser) {
          const usageUser =
            data.useCriticalStrikeCard?.cardInfo?.sendUser?.user ||
            data.useVaultGloveCard?.cardInfo?.sendUser?.user ||
            data.useSmokeCard?.cardInfo?.sendUser?.user ||
            data.useTop2Card?.cardInfo?.sendUser?.user ||
            data.useTop3Card?.cardInfo?.sendUser?.user;
          if (usageUser) {
            winnerUser = {
              userId: String(usageUser.userId || usageUser.userIdStr || 'user_' + Date.now()),
              uniqueId: usageUser.displayId || usageUser.uniqueId || 'supporter',
              nickname: usageUser.nickName || usageUser.nickname || 'داعم',
              avatarUrl: usageUser.avatarThumb?.urlList?.[0] || '',
            };
          }
        }

        // 3. Fallback to general user extraction
        if (!winnerUser) {
          winnerUser = this.extractUser(data) || this.extractUser(data.common);
        }

        // 4. Guaranteed Enigma fallback so it is NEVER discarded
        if (!winnerUser) {
          winnerUser = {
            userId: 'enigma_' + Date.now(),
            uniqueId: 'Enigma',
            nickname: 'داعم متخفي (Enigma)',
            avatarUrl: '',
          };
        }

        // 5 Reference Tools Specification
        // BattleCardMsgType enum from protobuf (tiktok-live-proto v3):
        //   0 = UNKNOWN_CARD_ACTION
        //   1 = CARD_OBTAIN_GUIDE
        //   2 = USE_CRITICAL_STRIKE_CARD  (GLOVES)
        //   3 = USE_SMOKE_CARD            (MIST)
        //   4 = AWARD_CARD_NOTICE         (acquisition notification)
        //   5 = USE_EXTRA_TIME_CARD
        //   6 = USE_SPECIAL_EFFECT_CARD   (THUNDER)
        //   7 = USE_POTION_CARD           (MATCH_GUIDE)
        //   8 = USE_WAVE_CARD
        //   9 = SPECIAL_EFFECT_NOTICE
        //  10 = USE_TOP_2_CARD            (BOOST_X2)
        //  11 = USE_TOP_3_CARD            (BOOST_X3)
        //  12 = USE_VAULT_GLOVE_CARD      (GLOVES)
        const TOOL_SPECS = [
          {
            code: 'MIST',
            nameAr: 'ضباب المعركة',
            multiplier: 1.0,
            durationSeconds: 30,
            keywords: ['ضباب', 'الضباب', 'دخان', 'الدخان', 'قنبلة', 'القنبلة', 'حجب', 'سحابة', 'smoke', 'mist', 'fog', 'grenade', 'blind'],
            isRawMatch: (d: any, n: any) =>
              Boolean(
                d.useSmokeCard ||
                  d.smokeCard ||
                  n.smokeCard ||
                  d.smoke ||
                  n.smoke ||
                  d.fogCard ||
                  n.fogCard ||
                  d.mistCard ||
                  n.mistCard ||
                  d.smokeGrenadeCard ||
                  n.smokeGrenadeCard ||
                  Number(d.msgType) === 3 ||
                  String(d.cardType).toUpperCase().includes('SMOKE') ||
                  String(d.cardType).toUpperCase().includes('MIST')
              ),
          },
          {
            code: 'BOOST_X3',
            nameAr: 'مضاعف النقاط x3',
            multiplier: 3.0,
            durationSeconds: 30,
            keywords: ['مضاعف 3', 'مضاعفة 3', 'مضاعف x3', '3 أضعاف', 'ثلاثة أضعاف', 'boost_x3', 'boost3', 'top3'],
            isRawMatch: (d: any, n: any) =>
              Boolean(
                d.useTop3Card ||
                  d.top3Card ||
                  n.top3Card ||
                  Number(d.msgType) === 11 ||
                  String(d.cardType).toUpperCase().includes('TOP3') ||
                  String(d.cardType).toUpperCase().includes('BOOST_X3')
              ),
          },
          {
            code: 'BOOST_X2',
            nameAr: 'مضاعف النقاط x2',
            multiplier: 2.0,
            durationSeconds: 30,
            keywords: ['مضاعف 2', 'مضاعفة 2', 'مضاعف x2', 'ضعفين', 'ضعفان', 'boost_x2', 'boost2', 'top2'],
            isRawMatch: (d: any, n: any) =>
              Boolean(
                d.useTop2Card ||
                  d.top2Card ||
                  n.top2Card ||
                  Number(d.msgType) === 10 ||
                  String(d.cardType).toUpperCase().includes('TOP2') ||
                  String(d.cardType).toUpperCase().includes('BOOST_X2')
              ),
          },
          {
            code: 'EXTRA_TIME',
            nameAr: 'وقت إضافي',
            multiplier: 1.0,
            durationSeconds: 15,
            keywords: ['وقت إضافي', 'وقت اضافي', 'تمديد', 'إضافي', 'اضافي', 'extra_time', 'extratime'],
            isRawMatch: (d: any, n: any) =>
              Boolean(
                d.useExtraTimeCard ||
                  d.extraTimeCard ||
                  n.extraTimeCard ||
                  Number(d.msgType) === 5 ||
                  String(d.cardType).toUpperCase().includes('EXTRA_TIME')
              ),
          },
          {
            code: 'THUNDER',
            nameAr: 'صاعقة الرعد',
            multiplier: 1.0,
            durationSeconds: 0,
            keywords: ['رعد', 'صاعقة', 'thunder', 'special_effect', 'specialeffect', 'wave'],
            isRawMatch: (d: any, n: any) =>
              Boolean(
                d.useSpecialEffectCard ||
                  d.useWaveCard ||
                  Number(d.msgType) === 6 ||
                  Number(d.msgType) === 8 ||
                  String(d.cardType).toUpperCase().includes('THUNDER') ||
                  String(d.cardType).toUpperCase().includes('WAVE') ||
                  String(d.cardType).toUpperCase().includes('SPECIAL_EFFECT')
              ),
          },
          {
            code: 'MATCH_GUIDE',
            nameAr: 'دليل المعركة',
            multiplier: 1.0,
            durationSeconds: 0,
            keywords: ['دليل', 'guide', 'potion', 'strategy'],
            isRawMatch: (d: any, n: any) =>
              Boolean(
                d.usePotionCard ||
                  d.useStrategyCard ||
                  d.useGuideCard ||
                  Number(d.msgType) === 7 ||
                  String(d.cardType).toUpperCase().includes('POTION') ||
                  String(d.cardType).toUpperCase().includes('GUIDE')
              ),
          },
          {
            code: 'GLOVES',
            nameAr: 'قفازات المعركة',
            multiplier: 5.0,
            durationSeconds: 30,
            keywords: ['قفاز', 'القفاز', 'قفازات', 'القفازات', 'قاضية', 'الضربة القاضية', 'ضربة قاضية', 'glove', 'gloves', 'critical', 'strike', 'knockout'],
            isRawMatch: (d: any, n: any) =>
              Boolean(
                d.useCriticalStrikeCard ||
                  d.useVaultGloveCard ||
                  d.criticalStrikeCard ||
                  d.vaultGloveCard ||
                  n.criticalStrikeCard ||
                  n.vaultGloveCard ||
                  Number(d.msgType) === 2 ||
                  Number(d.msgType) === 12 ||
                  String(d.cardType).toUpperCase().includes('CRITICAL') ||
                  String(d.cardType).toUpperCase().includes('GLOVE')
              ),
          },
        ];

        // UNKNOWN spec used when no tool type can be determined
        const UNKNOWN_SPEC = {
          code: 'UNKNOWN',
          nameAr: 'أداة غير معروفة',
          multiplier: 1.0,
          durationSeconds: 0,
          keywords: [] as string[],
          isRawMatch: () => false,
        };

        // 1. Direct Usage Detection (Priority: If someone used a tool in live battle)
        if (data.useCriticalStrikeCard || data.useVaultGloveCard) {
          const payload: PowerUpEventPayload = {
            powerUpCode: 'GLOVES',
            powerUpName: 'قفازات المعركة',
            actionState: 'USED',
            battleId: data.battleId ? String(data.battleId) : undefined,
            quantity: 1,
            multiplier: 5.0,
            durationSeconds: 30,
            evidenceNotes: `Live item card: GLOVES (USED x1) for ${winnerUser.uniqueId}`,
          };
          this.emitNormalized(
            UniversalEventType.POWERUP_USED,
            'WebcastLinkMicBattleItemCard',
            payload,
            winnerUser,
            data.common?.msgId ? String(data.common.msgId) : undefined,
            undefined,
            data
          );
          return;
        }

        if (data.useSmokeCard) {
          const payload: PowerUpEventPayload = {
            powerUpCode: 'MIST',
            powerUpName: 'ضباب المعركة',
            actionState: 'USED',
            battleId: data.battleId ? String(data.battleId) : undefined,
            quantity: 1,
            multiplier: 1.0,
            durationSeconds: 30,
            evidenceNotes: `Live item card: MIST (USED x1) for ${winnerUser.uniqueId}`,
          };
          this.emitNormalized(
            UniversalEventType.POWERUP_USED,
            'WebcastLinkMicBattleItemCard',
            payload,
            winnerUser,
            data.common?.msgId ? String(data.common.msgId) : undefined,
            undefined,
            data
          );
          return;
        }

        if (data.useTop2Card) {
          const payload: PowerUpEventPayload = {
            powerUpCode: 'BOOST_X2',
            powerUpName: 'مضاعف النقاط x2',
            actionState: 'USED',
            battleId: data.battleId ? String(data.battleId) : undefined,
            quantity: 1,
            multiplier: 2.0,
            durationSeconds: 30,
            evidenceNotes: `Live item card: BOOST_X2 (USED x1) for ${winnerUser.uniqueId}`,
          };
          this.emitNormalized(
            UniversalEventType.POWERUP_USED,
            'WebcastLinkMicBattleItemCard',
            payload,
            winnerUser,
            data.common?.msgId ? String(data.common.msgId) : undefined,
            undefined,
            data
          );
          return;
        }

        if (data.useTop3Card) {
          const payload: PowerUpEventPayload = {
            powerUpCode: 'BOOST_X3',
            powerUpName: 'مضاعف النقاط x3',
            actionState: 'USED',
            battleId: data.battleId ? String(data.battleId) : undefined,
            quantity: 1,
            multiplier: 3.0,
            durationSeconds: 30,
            evidenceNotes: `Live item card: BOOST_X3 (USED x1) for ${winnerUser.uniqueId}`,
          };
          this.emitNormalized(
            UniversalEventType.POWERUP_USED,
            'WebcastLinkMicBattleItemCard',
            payload,
            winnerUser,
            data.common?.msgId ? String(data.common.msgId) : undefined,
            undefined,
            data
          );
          return;
        }

        if (data.useExtraTimeCard) {
          const payload: PowerUpEventPayload = {
            powerUpCode: 'EXTRA_TIME',
            powerUpName: 'وقت إضافي',
            actionState: 'USED',
            battleId: data.battleId ? String(data.battleId) : undefined,
            quantity: 1,
            multiplier: 1.0,
            durationSeconds: 15,
            evidenceNotes: `Live item card: EXTRA_TIME (USED x1) for ${winnerUser.uniqueId}`,
          };
          this.emitNormalized(
            UniversalEventType.POWERUP_USED,
            'WebcastLinkMicBattleItemCard',
            payload,
            winnerUser,
            data.common?.msgId ? String(data.common.msgId) : undefined,
            undefined,
            data
          );
          return;
        }

        if (data.usePotionCard) {
          const payload: PowerUpEventPayload = {
            powerUpCode: 'THUNDER',
            powerUpName: 'صاعقة الرعد',
            actionState: 'USED',
            battleId: data.battleId ? String(data.battleId) : undefined,
            quantity: 1,
            multiplier: 1.0,
            durationSeconds: 0,
            evidenceNotes: `Live item card: THUNDER (USED x1) for ${winnerUser.uniqueId}`,
          };
          this.emitNormalized(
            UniversalEventType.POWERUP_USED,
            'WebcastLinkMicBattleItemCard',
            payload,
            winnerUser,
            data.common?.msgId ? String(data.common.msgId) : undefined,
            undefined,
            data
          );
          return;
        }

        if (data.useSpecialEffectCard || data.useStrategyCard || data.useGuideCard) {
          const payload: PowerUpEventPayload = {
            powerUpCode: 'MATCH_GUIDE',
            powerUpName: 'دليل المعركة',
            actionState: 'USED',
            battleId: data.battleId ? String(data.battleId) : undefined,
            quantity: 1,
            multiplier: 1.0,
            durationSeconds: 0,
            evidenceNotes: `Live item card: MATCH_GUIDE (USED x1) for ${winnerUser.uniqueId}`,
          };
          this.emitNormalized(
            UniversalEventType.POWERUP_USED,
            'WebcastLinkMicBattleItemCard',
            payload,
            winnerUser,
            data.common?.msgId ? String(data.common.msgId) : undefined,
            undefined,
            data
          );
          return;
        }

        // 2. Acquisition Detection - Full recursive text extraction (including all Text.pieces and sub-objects)
        const textPieces: string[] = [];
        const collectText = (obj: any) => {
          if (!obj) return;
          if (typeof obj === 'string') {
            textPieces.push(obj);
            return;
          }
          if (typeof obj === 'object') {
            if (obj.key) textPieces.push(String(obj.key));
            if (obj.defaultPattern) textPieces.push(String(obj.defaultPattern));
            if (obj.stringValue) textPieces.push(String(obj.stringValue));
            if (obj.patternRefValue?.key) textPieces.push(String(obj.patternRefValue.key));
            if (obj.patternRefValue?.defaultPattern) textPieces.push(String(obj.patternRefValue.defaultPattern));
            if (obj.describe) textPieces.push(String(obj.describe));
            if (obj.awardReason) textPieces.push(String(obj.awardReason));
            if (obj.cardName) textPieces.push(String(obj.cardName));
            if (obj.title) textPieces.push(String(obj.title));
            if (Array.isArray(obj.pieces)) {
              for (const p of obj.pieces) collectText(p);
            }
          }
        };

        collectText(notice.displayContent);
        collectText(data.common?.displayText);
        collectText(data.common?.describe);
        collectText(notice);
        collectText(data);

        const cleanText = textPieces
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        // Helper to find quantity adjacent to a specific tool's keyword
        const findToolQuantity = (text: string, keywords: string[]): number => {
          for (const kw of keywords) {
            const idx = text.indexOf(kw);
            if (idx !== -1) {
              const window = text.substring(Math.max(0, idx - 25), Math.min(text.length, idx + kw.length + 25));
              const m = window.match(/(?:x|×|\*|\b)(\d+)\b|(\d+)\s*(?:cards?|items?|بطاق(?:ة|ات)?)/i);
              if (m) {
                const val = parseInt(m[1] || m[2], 10);
                if (val >= 1 && val <= 50) return val;
              }
              if (window.includes('بطاقتين') || window.includes('اثنين') || window.includes('اثنان')) {
                return 2;
              }
            }
          }
          return 1;
        };

        // Match tools against explicit raw objects and recursive text keywords
        const matchedTools = TOOL_SPECS.filter((spec) => {
          return spec.isRawMatch(data, notice) || spec.keywords.some((kw) => cleanText.includes(kw));
        });

        // Determine tool list for the award
        let awardedTools: Array<{ tool: (typeof TOOL_SPECS)[0]; quantity: number }> = [];

        if (matchedTools.length === 0) {
          // Tier 1: Try msgType-based classification (BattleCardMsgType protobuf enum)
          const msgType = Number(data.msgType);
          const MSG_TYPE_MAP: Record<number, string> = {
            2: 'GLOVES',     // USE_CRITICAL_STRIKE_CARD
            3: 'MIST',       // USE_SMOKE_CARD
            5: 'EXTRA_TIME', // USE_EXTRA_TIME_CARD
            6: 'THUNDER',    // USE_SPECIAL_EFFECT_CARD
            7: 'MATCH_GUIDE',// USE_POTION_CARD
            8: 'THUNDER',    // USE_WAVE_CARD
            10: 'BOOST_X2',  // USE_TOP_2_CARD
            11: 'BOOST_X3',  // USE_TOP_3_CARD
            12: 'GLOVES',    // USE_VAULT_GLOVE_CARD
          };
          const msgTypeCode = MSG_TYPE_MAP[msgType];
          let resolvedSpec = msgTypeCode ? TOOL_SPECS.find((s) => s.code === msgTypeCode) : undefined;

          // Tier 2: Check which use*Card sub-field is populated
          if (!resolvedSpec) {
            if (data.useCriticalStrikeCard || data.useVaultGloveCard) resolvedSpec = TOOL_SPECS.find((s) => s.code === 'GLOVES');
            else if (data.useSmokeCard) resolvedSpec = TOOL_SPECS.find((s) => s.code === 'MIST');
            else if (data.useExtraTimeCard) resolvedSpec = TOOL_SPECS.find((s) => s.code === 'EXTRA_TIME');
            else if (data.useTop2Card) resolvedSpec = TOOL_SPECS.find((s) => s.code === 'BOOST_X2');
            else if (data.useTop3Card) resolvedSpec = TOOL_SPECS.find((s) => s.code === 'BOOST_X3');
            else if (data.useSpecialEffectCard || data.useWaveCard) resolvedSpec = TOOL_SPECS.find((s) => s.code === 'THUNDER');
            else if (data.usePotionCard || data.useStrategyCard || data.useGuideCard) resolvedSpec = TOOL_SPECS.find((s) => s.code === 'MATCH_GUIDE');
          }

          if (resolvedSpec) {
            awardedTools = [{ tool: resolvedSpec, quantity: Math.max(1, noticeCount || 1) }];
          } else {
            // NEVER fallback to GLOVES — use UNKNOWN and log raw data for investigation
            this.logger.warn(
              `[BattleItemCard] UNKNOWN tool type — msgType=${data.msgType}, cardType=${data.cardType}, ` +
              `cleanText="${cleanText.substring(0, 200)}", rawKeys=[${Object.keys(data).join(',')}]`
            );
            awardedTools = [{ tool: UNKNOWN_SPEC as any, quantity: Math.max(1, noticeCount || 1) }];
          }
        } else if (matchedTools.length === 1) {
          // Exactly one tool type matched (e.g. MIST only, or GLOVES only)
          const textCount = extractCountFromText(cleanText);
          const finalCount = textCount > 0 ? textCount : Math.max(1, noticeCount || 1);
          awardedTools = [{ tool: matchedTools[0], quantity: finalCount }];
        } else {
          // Multiple tools awarded in the same event (e.g. 1 Glove + 1 Mist!)
          awardedTools = matchedTools.map((m) => ({
            tool: m,
            quantity: findToolQuantity(cleanText, m.keywords),
          }));
        }

        // Dispatch awards for all winner supporters and all awarded tools
        const targetUsers = parsedAwarded.length > 0 ? parsedAwarded : [{ user: winnerUser, count: 1 }];

        for (const uAward of targetUsers) {
          for (const tAward of awardedTools) {
            const finalQty = awardedTools.length === 1 ? Math.max(1, uAward.count, tAward.quantity) : tAward.quantity;
            const payload: PowerUpEventPayload = {
              powerUpCode: tAward.tool.code,
              powerUpName: tAward.tool.nameAr,
              actionState: 'ACQUIRED',
              battleId: data.battleId ? String(data.battleId) : undefined,
              quantity: finalQty,
              multiplier: tAward.tool.multiplier,
              durationSeconds: tAward.tool.durationSeconds,
              evidenceNotes: `Live item card: ${tAward.tool.code} (ACQUIRED x${finalQty}) for ${uAward.user.uniqueId}`,
            };
            this.emitNormalized(
              UniversalEventType.POWERUP_ACQUIRED,
              'WebcastLinkMicBattleItemCard',
              payload,
              uAward.user,
              data.common?.msgId ? `${data.common.msgId}_${uAward.user.userId}_${tAward.tool.code}` : undefined,
              undefined,
              data
            );
          }
        }
      } catch (err: any) {
        this.logger.warn(`Could not process battleItemCard: ${err.message}`);
      }
    };


    // Helper for processing Boost Card messages (WebcastBoostCardMessage)
    const processBoostCardMessage = (data: any) => {
      try {
        const user = this.extractUser(data) || this.extractUser(data.common);
        if (!user) return;
        const cards = Array.isArray(data.cards) ? data.cards : [data];
        for (const c of cards) {
          const idStr = String(c.taskId || c.mCardId || c.taskSource || '').toLowerCase();
          const isX3 = idStr.includes('3') || idStr.includes('top3');
          const cardCode = isX3 ? 'BOOST_X3' : 'BOOST_X2';
          const cardName = isX3 ? 'مضاعف النقاط x3' : 'مضاعف النقاط x2';
          const payload: PowerUpEventPayload = {
            powerUpCode: cardCode,
            powerUpName: cardName,
            actionState: 'ACQUIRED',
            battleId: data.battleId ? String(data.battleId) : undefined,
            quantity: 1,
            multiplier: isX3 ? 3 : 2,
            durationSeconds: 30,
            evidenceNotes: `Live BoostCard: ${cardCode} for ${user.uniqueId}`,
          };
          this.emitNormalized(
            UniversalEventType.POWERUP_ACQUIRED,
            'WebcastBoostCardMessage',
            payload,
            user,
            data.common?.msgId ? String(data.common.msgId) : undefined,
            undefined,
            data
          );
        }
      } catch (err: any) {
        this.logger.warn(`Could not process boostCard: ${err.message}`);
      }
    };

    this.connection.on('boostCard', processBoostCardMessage);
    this.connection.on('battleItemCard', processBattleItemCard);

    // LinkMic Opponent Gift (live event hook if fired directly by connector)
    this.connection.on('linkMicOpponentGift', (data: any) => {
      const actualData = data?.data || data;
      const opponentGiftPayload = {
        senderUserId: String(actualData?.senderUserId || actualData?.userId || actualData?.fromUserId || ''),
        opponentRoomId: String(actualData?.opponentRoomId || actualData?.roomId || ''),
        opponentUserId: String(actualData?.opponentUserId || actualData?.toUserId || ''),
        giftId: actualData?.giftId || 0,
        giftName: actualData?.giftName || actualData?.gift?.name || '',
        giftPictureUrl: actualData?.giftPictureUrl || actualData?.gift?.image?.urlList?.[0] || '',
        diamondCount: Number(actualData?.diamondCount || actualData?.diamonds || 0),
        transactionId: actualData?.transactionId || actualData?.msgId || undefined,
        startedAtMs: Number(actualData?.startedAtMs || Date.now()),
        endsAtMs: Number(actualData?.endsAtMs || 0),
      };

      const user = this.extractUser(actualData) || {
        userId: opponentGiftPayload.senderUserId || 'opponent_gifter',
        uniqueId: actualData?.senderUniqueId || 'opponent_gifter',
        nickname: actualData?.senderNickname || 'داعم الخصم',
      };

      this.emitNormalized(
        UniversalEventType.LINKMIC_OPPONENT_GIFT,
        'linkMicOpponentGift',
        opponentGiftPayload,
        user,
        actualData?.msgId ? String(actualData.msgId) : undefined,
        undefined,
        data
      );
    });

    // LinkMic Battle Punish Finish (punish/verdict timeout or conclusion)
    this.connection.on('linkMicBattlePunishFinish', (data: any) => {
      this.emitNormalized(
        UniversalEventType.BATTLE_END,
        'linkMicBattlePunishFinish',
        {
          battleId: String(data?.battleId || ''),
          winningTeamId: data?.reason === 1 ? 'TEAM_A' : 'TEAM_B',
          isDraw: data?.reason === 3,
        },
        undefined,
        data?.msgId ? String(data.msgId) : undefined,
        undefined,
        data
      );
    });

    // Catch-all for UNKNOWN_EVENT via decodedData stream with specialized decoders
    const knownMethods = new Set([
      'WebcastChatMessage',
      'WebcastGiftMessage',
      'WebcastLikeMessage',
      'WebcastShareMessage',
      'WebcastSocialMessage',
      'WebcastMemberMessage',
      'WebcastRoomUserSeqMessage',
      'WebcastLinkMicBattle',
      'WebcastLinkMicArmies',
      'WebcastControlMessage',
    ]);

    this.connection.on('decodedData', (method: string, decoded: any, rawPayload: any) => {
      try {
        const actualData = decoded?.data || decoded;

        // Route specialized battle messages
        if (method === 'WebcastLinkMicBattleItemCard') {
          processBattleItemCard(actualData);
          return;
        }

        if (method === 'WebcastBoostCardMessage') {
          processBoostCardMessage(actualData);
          return;
        }

        if (method === 'WebcastLinkMicBattlePunishFinish') {
          this.emitNormalized(
            UniversalEventType.BATTLE_END,
            'linkMicBattlePunishFinish',
            {
              battleId: String(actualData?.battleId || ''),
              winningTeamId: actualData?.reason === 1 ? 'TEAM_A' : 'TEAM_B',
              isDraw: actualData?.reason === 3,
            },
            undefined,
            actualData?.common?.msgId ? String(actualData.common.msgId) : undefined,
            undefined,
            rawPayload
          );
          return;
        }

        if (method === 'WebcastLinkMicOpponentGiftMessage' || method === 'WebcastLinkMicOpponentGift') {
          const opponentGiftPayload = {
            senderUserId: String(actualData?.senderUserId || actualData?.userId || actualData?.fromUserId || ''),
            opponentRoomId: String(actualData?.opponentRoomId || actualData?.roomId || ''),
            opponentUserId: String(actualData?.opponentUserId || actualData?.toUserId || ''),
            giftId: actualData?.giftId || 0,
            giftName: actualData?.giftName || actualData?.gift?.name || '',
            giftPictureUrl: actualData?.giftPictureUrl || actualData?.gift?.image?.urlList?.[0] || '',
            diamondCount: Number(actualData?.diamondCount || actualData?.diamonds || 0),
            transactionId: actualData?.transactionId || actualData?.common?.msgId ? String(actualData.transactionId || actualData.common.msgId) : undefined,
            startedAtMs: Number(actualData?.startedAtMs || Date.now()),
            endsAtMs: Number(actualData?.endsAtMs || 0),
          };

          const user = this.extractUser(actualData) || {
            userId: opponentGiftPayload.senderUserId || 'opponent_gifter',
            uniqueId: actualData?.senderUniqueId || 'opponent_gifter',
            nickname: actualData?.senderNickname || 'داعم الخصم',
          };

          this.emitNormalized(
            UniversalEventType.LINKMIC_OPPONENT_GIFT,
            method,
            opponentGiftPayload,
            user,
            actualData?.common?.msgId ? String(actualData.common.msgId) : undefined,
            undefined,
            rawPayload
          );
          return;
        }

        if (!knownMethods.has(method)) {
          const user = this.extractUser(actualData);
          const msgId = actualData?.common?.msgId || actualData?.msgId || String(Date.now());
          this.emitNormalized(
            UniversalEventType.UNKNOWN_EVENT,
            method,
            actualData || {},
            user,
            String(msgId),
            undefined,
            rawPayload
          );
        }
      } catch (err: any) {
        this.logger.debug(`Could not normalize decodedData method ${method}: ${err.message}`);
      }
    });

    this.connection.on('websocketConnected', (ws: any) => {
      this._telemetry.websocketState = 'OPEN';
      this._telemetry.lastHeartbeat = new Date().toISOString();
      this.logger.info('WebSocket connection opened successfully.');
    });

    // Stream termination & error handling
    this.connection.on('streamEnd', () => {
      this.logger.info('Received streamEnd event from TikTok');
      this.emitNormalized(UniversalEventType.STREAM_ENDED, 'streamEnd', {});
      this._telemetry.websocketState = 'CLOSED';
      this.stopHeartbeatWatchdog();
      this.setState('ENDED');
    });

    this.connection.on('disconnected', (data: any) => {
      const closeCode = data?.code || data?.closeCode || '';
      const closeReason = data?.reason || data?.closeReason || '';
      this.logger.warn(`TikTok connection disconnected (code: ${closeCode}, reason: ${closeReason})`);
      this._telemetry.websocketState = 'CLOSED';
      this.stopHeartbeatWatchdog();
      this.handleReconnect(String(closeCode || closeReason || 'disconnected'));
    });

    this.connection.on('error', (err: any) => {
      const errMsg = err?.exception?.message || err?.info || err?.message || String(err);
      this._telemetry.lastError = errMsg;
      this._telemetry.errorCount = (this._telemetry.errorCount || 0) + 1;

      // Only degrade or log as error if it represents an actual connection failure
      if (err?.info?.includes('WebSocket Error') || err?.info?.includes('Error while connecting') || err?.exception?.name === 'UserOfflineError') {
        this.logger.error(`TikTok connection error: ${errMsg}`);
        this.setState('DEGRADED');
      } else {
        this.logger.debug(`TikTok connector advisory notice: ${errMsg}`);
      }
    });
  }

  /**
   * Enhanced reconnect with close-code classification.
   * TikTok close codes (from tiktool/Lorenzaformic research):
   *   4404  = NOT_LIVE (streamer went offline)
   *   4005/4006/4555 = Stream Ended (host ended broadcast)
   *   1005/1006/1011 = Network Drop (transport failure)
   *   STALE_CONNECTION = Watchdog detected no events
   */
  private async handleReconnect(reason?: string) {
    if (this._state === 'OFFLINE' || this._state === 'ENDED') return;

    // Classify the reason and determine delay strategy
    const classification = this.classifyDisconnectReason(reason);

    if (classification === 'STREAM_ENDED') {
      // Stream explicitly ended by host - don't aggressively reconnect
      this.logger.info('Stream ended by host. Suspending reconnect; supervisor will poll for next broadcast.');
      this.setState('ENDED');
      return;
    }

    if (classification === 'NOT_LIVE') {
      // Streamer went offline - use tiered backoff (30s -> 90s -> 300s)
      this.logger.info('Streamer went offline (4404). Moving to OFFLINE state.');
      this.setState('OFFLINE');
      return;
    }

    if (this.reconnectAttempt >= this.maxReconnectAttempts) {
      this.logger.error(`Max reconnection attempts (${this.maxReconnectAttempts}) reached. Marking OFFLINE.`);
      this.setState('OFFLINE');
      return;
    }

    this.reconnectAttempt++;
    this._telemetry.reconnectCount++;
    this._telemetry.lastReconnect = new Date().toISOString();
    this.setState('RECONNECTING');

    // Compute delay based on classification
    let delay: number;
    if (classification === 'STALE_CONNECTION') {
      // Stale connections: faster initial reconnect (2s + jitter)
      delay = 2000 + Math.floor(Math.random() * 1000);
    } else {
      // Network drops: exponential backoff with jitter (1s, 2s, 4s, 8s, 16s, max 30s)
      const baseDelay = Math.min(1000 * Math.pow(2, this.reconnectAttempt - 1), 30000);
      const jitter = Math.floor(Math.random() * 500);
      delay = baseDelay + jitter;
    }

    this.logger.info(
      `Reconnecting in ${delay}ms (attempt ${this.reconnectAttempt}/${this.maxReconnectAttempts}, reason: ${classification})...`
    );

    setTimeout(async () => {
      if (this.options) {
        const success = await this.connect(this.options);
        if (!success) {
          this.handleReconnect(reason);
        }
      }
    }, delay);
  }

  /**
   * Classify disconnect reason based on close codes and reason strings.
   */
  private classifyDisconnectReason(reason?: string): 'NETWORK_DROP' | 'STREAM_ENDED' | 'NOT_LIVE' | 'STALE_CONNECTION' {
    if (!reason) return 'NETWORK_DROP';

    if (reason === 'STALE_CONNECTION') return 'STALE_CONNECTION';

    // TikTok WebSocket close codes
    if (reason.includes('4404')) return 'NOT_LIVE';
    if (reason.includes('4005') || reason.includes('4006') || reason.includes('4555')) return 'STREAM_ENDED';
    if (reason.includes('streamEnd') || reason.includes('ended')) return 'STREAM_ENDED';

    return 'NETWORK_DROP';
  }
}
