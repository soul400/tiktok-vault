import { PowerUpType, PowerUpTransactionType } from '@prisma/client';

export interface PowerUpCatalogItem {
  id: string;
  code: string;
  nameAr: string;
  nameEn: string;
  type: PowerUpType;
  multiplier: number;
  durationSeconds: number;
  iconName?: string | null;
  assetUrl?: string | null;
  isActive: boolean;
}

export interface PowerUpTransactionRecord {
  id: string;
  userId: string;
  powerUpCode: string;
  transactionType: PowerUpTransactionType;
  quantity: number;
  quantityBefore: number;
  quantityAfter: number;
  streamSessionId?: string | null;
  battleSessionId?: string | null;
  evidenceNotes: string;
  occurredAt: Date;
}

export interface UserPowerUpBalance {
  userDbId: string;
  tiktokUserId: string;
  uniqueId: string;
  nickname: string;
  powerUpCode: string;
  powerUpName: string;
  quantity: number;
  totalAcquired: number;
  totalUsed: number;
  lastUsedAt?: Date | null;
}
