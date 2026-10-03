# AEP — Universal Event Model (UEM) Specification

## 1. Concept & Rationale
The Universal Event Model provides a strict contract between raw provider protocols (TikTok-Live-Connector, TikTok WebSockets, WebRTC/Protobuf signaling) and internal downstream processing. 

No component downstream of the connector layer knows or depends on TikTok-specific message wrappers. If TikTok modifies their internal schemas or protocol keys, only the connector adapter is updated; the database, analytics, battle engine, power-up inventory, and UI remain untouched.

---

## 2. Event Envelope Specification

Every event in the system conforms to the standard `LiveEvent<T>` envelope:

```typescript
export interface LiveEventEnvelope<T = unknown> {
  // Global Unique Identification
  id: string;                         // UUID v7 (time-sortable)
  eventId: string;                    // Internal deduplication key: hash(provider, streamId, providerEventId || fallbackHash)
  
  // Provenance & Source Metadata
  provider: 'TIKTOK_LIVE_CONNECTOR' | 'TIKTOK_PROTOBUF' | 'MOCK_TEST_PROVIDER';
  providerVersion: string;           // e.g. "2.5.0"
  providerEventName: string;          // e.g. "chat", "gift", "like", "battle", "battleItemCard"
  providerEventId?: string;           // Provider-assigned event/msg ID if available
  providerTransactionId?: string;     // Provider transaction ID (especially for gifts/cards)
  
  // Stream & Session Context
  streamerId: string;                 // Tracked streamer UUID
  streamerUsername: string;           // e.g. "streamer_alpha"
  sessionId: string;                  // Active LiveSession UUID
  roomId: string;                     // TikTok Room ID
  
  // Temporal Metadata
  timestampUtc: string;               // ISO 8601 UTC (e.g. "2026-09-20T04:45:00.123Z")
  receivedAtUtc: string;              // Time ingested into pipeline
  
  // User Association (Optional for room-wide telemetry)
  user?: UniversalUserSnapshot;
  
  // Domain Event Classification
  eventType: UniversalEventType;
  
  // Typed Normalized Payload
  payload: T;
  
  // Raw Provider Payload (preserved for 30-day replay/audit)
  rawPayload?: Record<string, unknown>;
}

export interface UniversalUserSnapshot {
  userId: string;                     // TikTok user ID (numeric string)
  uniqueId: string;                   // @handle (without @)
  nickname: string;                   // Display name
  avatarUrl?: string;
  secUid?: string;
  country?: string;
  badgeList?: Array<{
    id: string;
    name: string;
    type: string;
    level?: number;
  }>;
  isModerator?: boolean;
  isSubscriber?: boolean;
}
```

---

## 3. Event Types (`UniversalEventType`)

```typescript
export enum UniversalEventType {
  // Connection & Lifecycle
  STREAM_DETECTED = 'STREAM_DETECTED',
  STREAM_CONNECTED = 'STREAM_CONNECTED',
  STREAM_DISCONNECTED = 'STREAM_DISCONNECTED',
  STREAM_HEARTBEAT = 'STREAM_HEARTBEAT',
  STREAM_ENDED = 'STREAM_ENDED',

  // Room Metrics
  VIEWER_COUNT_UPDATE = 'VIEWER_COUNT_UPDATE',
  ROOM_INFO_UPDATE = 'ROOM_INFO_UPDATE',

  // Audience Interactions
  CHAT_COMMENT = 'CHAT_COMMENT',
  LIKE_BURST = 'LIKE_BURST',
  SHARE = 'SHARE',
  FOLLOW = 'FOLLOW',
  USER_JOIN = 'USER_JOIN',
  SUBSCRIBE = 'SUBSCRIBE',

  // Gifts & Support
  GIFT_RECEIVED = 'GIFT_RECEIVED',
  GIFT_COMBO_STREAK = 'GIFT_COMBO_STREAK',

  // Battle (PK) Events
  BATTLE_START = 'BATTLE_START',
  BATTLE_UPDATE = 'BATTLE_UPDATE',
  BATTLE_ARMIES_UPDATE = 'BATTLE_ARMIES_UPDATE',
  BATTLE_GAMEPLAY = 'BATTLE_GAMEPLAY',
  BATTLE_PUNISH_START = 'BATTLE_PUNISH_START',
  BATTLE_PUNISH_FINISH = 'BATTLE_PUNISH_FINISH',
  BATTLE_END = 'BATTLE_END',

  // Power-up & Battle Tool Events (State-Machine Driven)
  POWERUP_DETECTED = 'POWERUP_DETECTED',
  POWERUP_ACQUIRED = 'POWERUP_ACQUIRED',
  POWERUP_USED = 'POWERUP_USED',
  POWERUP_EXPIRED = 'POWERUP_EXPIRED'
}
```

---

## 4. Normalized Payload Schemas

### 4.1 Chat Comment (`CHAT_COMMENT`)
```typescript
export interface ChatCommentPayload {
  commentId: string;
  text: string;
  language?: string;
  isPinned?: boolean;
  emotes?: Array<{ id: string; url: string }>;
}
```

### 4.2 Like Burst (`LIKE_BURST`)
```typescript
export interface LikeBurstPayload {
  likeCount: number;         // Delta in this burst (or connector batch)
  totalLikes: number;        // Cumulative likes reported for room
}
```

### 4.3 Gift Received (`GIFT_RECEIVED`)
```typescript
export interface GiftReceivedPayload {
  giftId: string;
  giftName: string;
  diamondCost: number;       // Per-unit diamond value
  repeatCount: number;       // Number sent in combo
  totalDiamonds: number;     // diamondCost * repeatCount
  comboId?: string;
  giftIconUrl?: string;
  isSpecialEffect?: boolean;
  receiverUserId?: string;   // Host or guest
}
```

### 4.4 Battle Events (`BATTLE_START`, `BATTLE_UPDATE`, `BATTLE_END`)
```typescript
export interface BattleStartPayload {
  battleId: string;
  battleType: '1v1' | '2v2' | 'MULTI' | 'UNKNOWN';
  teams: Array<{
    teamId: string;
    hosts: Array<{
      userId: string;
      uniqueId: string;
      nickname: string;
      avatarUrl?: string;
    }>;
  }>;
  durationSeconds: number;
}

export interface BattleUpdatePayload {
  battleId: string;
  teams: Array<{
    teamId: string;
    score: number;
    contributors: Array<{
      userId: string;
      uniqueId: string;
      nickname: string;
      score: number;
      rank: number;
      avatarUrl?: string;
    }>;
  }>;
  timeRemainingSeconds?: number;
  currentMvpUserId?: string;
}

export interface BattleEndPayload {
  battleId: string;
  winningTeamId?: string;
  isDraw: boolean;
  teams: Array<{
    teamId: string;
    finalScore: number;
    mvpUserId?: string;
    mvpNickname?: string;
  }>;
}
```

### 4.5 Battle Item / Power-Up Payload
```typescript
export interface PowerUpEventPayload {
  powerUpCode: string;       // e.g. "BOOST_X2", "BOOST_X3", "GLOVES", "MIST", "THUNDER", "EXTRA_TIME", "MATCH_GUIDE"
  powerUpName: string;       // Human-readable title
  actionState: 'DETECTED' | 'CLASSIFIED' | 'ACQUIRED' | 'USED' | 'EXPIRED';
  battleId?: string;         // Linked battle ID if active
  targetTeamId?: string;
  targetUserId?: string;
  quantity: number;          // Typically 1
  multiplier?: number;       // e.g. 2 or 3
  durationSeconds?: number;  // e.g. 30 seconds for gloves/mist
  evidenceNotes: string;     // Justification/proof from connector event payload
}
```

---

## 5. Deduplication Gate Algorithm

Because TikTok WebSockets and reconnect routines emit duplicate messages, the deduplication engine runs before Redis ingestion:

```typescript
function computeEventDeduplicationKey(event: LiveEventEnvelope): string {
  if (event.providerTransactionId) {
    return `dedup:${event.provider}:tx:${event.providerTransactionId}`;
  }
  if (event.providerEventId) {
    return `dedup:${event.provider}:ev:${event.providerEventId}`;
  }
  // Fallback composite deterministic hash
  const payloadFingerprint = sha256(
    `${event.eventType}:${event.streamerId}:${event.user?.userId || ''}:${event.timestampUtc}:${JSON.stringify(event.payload)}`
  );
  return `dedup:${event.provider}:hash:${payloadFingerprint}`;
}
```
- **Redis Dedup Key**: `SET key 1 NX EX 300` (5-minute sliding window).
- If key exists, increment duplicate metric counter and drop silently from the write pipeline.
