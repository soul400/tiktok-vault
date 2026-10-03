import { z } from 'zod';
import { UniversalEventType } from './types.js';

export const UniversalUserSnapshotSchema = z.object({
  userId: z.string().min(1),
  uniqueId: z.string().min(1),
  nickname: z.string(),
  avatarUrl: z.string().optional(),
  secUid: z.string().optional(),
  country: z.string().optional(),
  badges: z.array(z.any()).optional(),
  isModerator: z.boolean().optional(),
  isSubscriber: z.boolean().optional(),
});

export const LiveEventEnvelopeSchema = z.object({
  id: z.string().uuid(),
  eventId: z.string().min(1),
  provider: z.enum(['TIKTOK_LIVE_CONNECTOR', 'TIKTOK_PROTOBUF', 'MOCK_TEST_PROVIDER']),
  providerVersion: z.string(),
  providerEventName: z.string(),
  providerEventId: z.string().optional(),
  providerTransactionId: z.string().optional(),

  streamerId: z.string().uuid(),
  streamerUsername: z.string().min(1),
  sessionId: z.string().uuid(),
  roomId: z.string().min(1),

  timestampUtc: z.string().datetime(),
  receivedAtUtc: z.string().datetime(),

  user: UniversalUserSnapshotSchema.optional(),
  eventType: z.nativeEnum(UniversalEventType),
  payload: z.record(z.any()),
  rawPayload: z.record(z.any()).optional(),
});

export const ChatCommentPayloadSchema = z.object({
  commentId: z.string(),
  text: z.string(),
  language: z.string().optional(),
  isPinned: z.boolean().optional(),
});

export const LikeBurstPayloadSchema = z.object({
  likeCount: z.number().int().nonnegative(),
  totalLikes: z.number().int().nonnegative(),
});

export const GiftReceivedPayloadSchema = z.object({
  giftId: z.string(),
  giftName: z.string(),
  diamondCost: z.number().int().nonnegative(),
  repeatCount: z.number().int().positive(),
  totalDiamonds: z.number().int().nonnegative(),
  comboId: z.string().optional(),
  giftIconUrl: z.string().optional(),
  isSpecialEffect: z.boolean().optional(),
  receiverUserId: z.string().optional(),
});

export const PowerUpEventPayloadSchema = z.object({
  powerUpCode: z.string(),
  powerUpName: z.string(),
  actionState: z.enum(['DETECTED', 'CLASSIFIED', 'ACQUIRED', 'USED', 'EXPIRED']),
  battleId: z.string().optional(),
  targetTeamId: z.string().optional(),
  targetUserId: z.string().optional(),
  quantity: z.number().int().positive(),
  multiplier: z.number().optional(),
  durationSeconds: z.number().int().nonnegative().optional(),
  evidenceNotes: z.string(),
});
