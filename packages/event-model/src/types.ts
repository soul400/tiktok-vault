/**
 * AEP — Universal Event Model Enums & TypeScript Definitions
 */

export enum UniversalEventType {
  // Stream Lifecycle
  STREAM_DETECTED = 'STREAM_DETECTED',
  STREAM_CONNECTED = 'STREAM_CONNECTED',
  STREAM_DISCONNECTED = 'STREAM_DISCONNECTED',
  STREAM_HEARTBEAT = 'STREAM_HEARTBEAT',
  STREAM_ENDED = 'STREAM_ENDED',

  // Metrics
  VIEWER_COUNT_UPDATE = 'VIEWER_COUNT_UPDATE',
  ROOM_INFO_UPDATE = 'ROOM_INFO_UPDATE',

  // Audience
  CHAT_COMMENT = 'CHAT_COMMENT',
  LIKE_BURST = 'LIKE_BURST',
  SHARE = 'SHARE',
  FOLLOW = 'FOLLOW',
  USER_JOIN = 'USER_JOIN',
  SUBSCRIBE = 'SUBSCRIBE',

  // Gifts
  GIFT_RECEIVED = 'GIFT_RECEIVED',
  GIFT_COMBO_STREAK = 'GIFT_COMBO_STREAK',

  // Battles (PK)
  BATTLE_START = 'BATTLE_START',
  BATTLE_UPDATE = 'BATTLE_UPDATE',
  BATTLE_ARMIES_UPDATE = 'BATTLE_ARMIES_UPDATE',
  BATTLE_GAMEPLAY = 'BATTLE_GAMEPLAY',
  BATTLE_PUNISH_START = 'BATTLE_PUNISH_START',
  BATTLE_PUNISH_FINISH = 'BATTLE_PUNISH_FINISH',
  BATTLE_END = 'BATTLE_END',

  // Power-ups / Battle Tools
  POWERUP_DETECTED = 'POWERUP_DETECTED',
  POWERUP_ACQUIRED = 'POWERUP_ACQUIRED',
  POWERUP_USED = 'POWERUP_USED',
  POWERUP_EXPIRED = 'POWERUP_EXPIRED',

  // Opponent & Inter-room events
  LINKMIC_OPPONENT_GIFT = 'LINKMIC_OPPONENT_GIFT',

  // Catch-All / Unknown Events
  UNKNOWN_EVENT = 'UNKNOWN_EVENT'
}

export type ProviderType = 'TIKTOK_LIVE_CONNECTOR' | 'TIKTOK_PROTOBUF' | 'MOCK_TEST_PROVIDER';

export interface UniversalUserSnapshot {
  userId: string;                     // Unique TikTok internal user id
  uniqueId: string;                   // @handle (without @)
  nickname: string;                   // Display name
  avatarUrl?: string;
  secUid?: string;
  country?: string;
  badges?: Array<{
    id?: string;
    name?: string;
    type?: string;
    level?: number;
  }>;
  isModerator?: boolean;
  isSubscriber?: boolean;
}

export interface LiveEventEnvelope<T = Record<string, unknown>> {
  id: string;                         // UUID
  eventId: string;                    // Deterministic deduplication key
  provider: ProviderType;
  providerVersion: string;
  providerEventName: string;
  providerEventId?: string;
  providerTransactionId?: string;

  streamerId: string;
  streamerUsername: string;
  sessionId: string;
  roomId: string;

  timestampUtc: string;               // ISO 8601 UTC
  receivedAtUtc: string;

  user?: UniversalUserSnapshot;
  eventType: UniversalEventType;
  payload: T;
  rawPayload?: Record<string, unknown>;
}

// Payload Types
export interface ChatCommentPayload {
  commentId: string;
  text: string;
  language?: string;
  isPinned?: boolean;
}

export interface LikeBurstPayload {
  likeCount: number;
  totalLikes: number;
}

export interface SharePayload {
  shareCount?: number;
  shareType?: string;
}

export interface FollowPayload {
  followTimeUtc?: string;
}

export interface UserJoinPayload {
  userCount?: number;
}

export interface ViewerCountPayload {
  viewerCount: number;
}

export interface GiftReceivedPayload {
  giftId: string;
  giftName: string;
  diamondCost: number;
  repeatCount: number;
  totalDiamonds: number;
  comboId?: string;
  giftIconUrl?: string;
  isSpecialEffect?: boolean;
  receiverUserId?: string;
}

export interface BattleParticipantSnapshot {
  userId: string;
  uniqueId: string;
  nickname: string;
  avatarUrl?: string;
  score?: number;
  rank?: number;
}

export interface BattleTeamSnapshot {
  teamId: string;
  score: number;
  hosts: BattleParticipantSnapshot[];
  contributors?: BattleParticipantSnapshot[];
}

export interface BattleStartPayload {
  battleId: string;
  battleType: '1v1' | '2v2' | 'MULTI' | 'UNKNOWN';
  teams: BattleTeamSnapshot[];
  durationSeconds: number;
}

export interface BattleUpdatePayload {
  battleId: string;
  teams: BattleTeamSnapshot[];
  timeRemainingSeconds?: number;
  currentMvpUserId?: string;
}

export interface BattleEndPayload {
  battleId: string;
  winningTeamId?: string;
  isDraw: boolean;
  teams: BattleTeamSnapshot[];
}

export type PowerUpActionState = 'DETECTED' | 'CLASSIFIED' | 'ACQUIRED' | 'USED' | 'EXPIRED';

export interface PowerUpEventPayload {
  powerUpCode: string;
  powerUpName: string;
  actionState: PowerUpActionState;
  battleId?: string;
  targetTeamId?: string;
  targetUserId?: string;
  quantity: number;
  multiplier?: number;
  durationSeconds?: number;
  evidenceNotes: string;
}

export interface LinkMicOpponentGiftPayload {
  senderUserId: string;
  opponentRoomId: string;
  opponentUserId?: string;
  opponentUniqueId?: string;
  opponentNickname?: string;
  giftId: number | string;
  giftName?: string;
  giftPictureUrl?: string;
  diamondCount?: number;
  transactionId?: string;
  startedAtMs?: number;
  endsAtMs?: number;
}
