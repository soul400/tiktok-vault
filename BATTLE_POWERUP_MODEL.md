# AEP — Battle Intelligence & Power-up State Machine Specification

## 1. Executive Summary & Core Rules
Power-ups (Battle Tools / Boost Cards) are a fundamental competitive mechanism in TikTok LIVE Battles (PK). In high-stakes battles, items like **Gloves (x5 Crit Chance)**, **Mist / Fog (Hiding Score)**, **Thunder (Striking Opponent Score)**, **Boost x2 / x3 Multipliers**, and **Extra Time** decide victory or defeat.

### Critical Integrity Invariants:
1. **Zero Assumption / Evidence-Based Classification**:
   - Never assume every `battleItemCard` event indicates an item has been acquired or used.
   - Without deterministic evidence (such as verified card award flags or activation triggers), the event is marked `DETECTED` only.
2. **Strict Invariant**: \( \text{quantity} \ge 0 \).
   - Under no circumstances will any user balance drop below 0.
3. **Transaction Ledger as Source of Truth**:
   - `power_up_transactions` is an append-only ledger.
   - `user_power_up_inventory` is a projection updated in a database transaction with `FOR UPDATE` row-level locks.
4. **Catalog Extensibility**:
   - Tools are dynamic entries in `power_up_catalog`. No tool types or multipliers are hardcoded in application logic.

---

## 2. Power-Up Lifecycle State Machine

```
                        ┌──────────────────────────────────────┐
                        │   Raw Event (e.g. battleItemCard)    │
                        └──────────────────┬───────────────────┘
                                           │
                                           ▼
                                 [ Parse & Validate ]
                                           │
                       Does payload have verified item signature?
                                           │
                         ┌─────────────────┴─────────────────┐
                      NO │                                   │ YES
                         ▼                                   ▼
          ┌─────────────────────────────┐     ┌─────────────────────────────┐
          │      STATE: DETECTED        │     │      STATE: CLASSIFIED      │
          │ (Logged for audit / analysis│     │ (Identified Catalog Item ID)│
          │  No inventory changes)      │     └──────────────┬──────────────┘
          └─────────────────────────────┘                    │
                                            Is it an Acquisition or Activation?
                                           ┌─────────────────┴─────────────────┐
                               ACQUISITION │                                   │ USAGE / ACTIVATION
                                           ▼                                   ▼
                            ┌─────────────────────────────┐     ┌─────────────────────────────┐
                            │      STATE: ACQUIRED        │     │        STATE: USED          │
                            │  1. Insert Transaction      │     │  1. Check inventory >= qty  │
                            │     type = 'ACQUIRED'       │     │  2. If 0: Log UNKNOWN_USE   │
                            │  2. Increment Inventory     │     │  3. Insert Transaction      │
                            │  3. Emit 'powerup:acquired' │     │     type = 'USED'           │
                            └─────────────────────────────┘     │  4. Decrement Inventory     │
                                                                │  5. Link BattleSession ID   │
                                                                │  6. Emit 'powerup:used'     │
                                                                └─────────────────────────────┘
```

---

## 3. Power-Up Catalog Specification

| Code | Arabic Name | English Name | Type | Multiplier | Duration | Strategic Effect |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `GLOVES` | قفازات المعركة | Battle Gloves | `MULTIPLIER` | 5.0 | 30s | Increases chance of critical hits (5x points per gift) |
| `MIST` | ضباب المعركة | Fog of War / Mist | `OBFUSCATION` | 1.0 | 30s | Conceals team score and contributions from opponents |
| `THUNDER` | صاعقة الرعد | Thunder Strike | `STRIKE` | 1.0 | 0s | Reduces opponent score burst or interrupts streak |
| `BOOST_X2` | مضاعف x2 | Boost Multiplier x2 | `MULTIPLIER` | 2.0 | 30s | Doubles points gained for team during active window |
| `BOOST_X3` | مضاعف x3 | Boost Multiplier x3 | `MULTIPLIER` | 3.0 | 30s | Triples points gained for team during active window |
| `EXTRA_TIME`| وقت إضافي | Extra Time Card | `TIME_EXTENSION`| 1.0| 15s | Adds extra seconds to current round |
| `MATCH_GUIDE`| دليل المعركة | Match Guide | `STRATEGY` | 1.0 | 0s | Recommended tactics for supporters |

New power-ups introduced by TikTok are seamlessly added by inserting a new row into `power_up_catalog`.

---

## 4. Double-Entry Inventory Ledger Mechanics

### Transaction Types:
- `ACQUIRED`: Supporter or host was rewarded with a battle tool (inventory +qty).
- `USED`: Supporter or host deployed tool in a battle (inventory -qty).
- `EXPIRED`: Unused time-limited card expired without activation (inventory -qty).
- `ADJUSTED`: Administrative audit correction with audit justification.
- `UNKNOWN`: Tool activation detected in room without prior registered inventory.

### Atomic Acquisition Handler:
```typescript
async function recordPowerUpAcquisition(
  tx: PrismaTransaction,
  params: {
    userId: string;
    powerUpCode: string;
    quantity: number;
    sessionId?: string;
    battleId?: string;
    sourceEventId: string;
    notes: string;
    occurredAt: Date;
  }
) {
  const catalogItem = await tx.powerUpCatalog.findUniqueOrThrow({
    where: { code: params.powerUpCode }
  });

  // Lock user inventory row
  let inventory = await tx.userPowerUpInventory.findUnique({
    where: { userId_powerUpId: { userId: params.userId, powerUpId: catalogItem.id } }
  });

  const qtyBefore = inventory ? inventory.quantity : 0;
  const qtyAfter = qtyBefore + params.quantity;

  // 1. Insert immutable transaction
  await tx.powerUpTransaction.create({
    data: {
      userId: params.userId,
      powerUpId: catalogItem.id,
      streamSessionId: params.sessionId,
      battleSessionId: params.battleId,
      transactionType: 'ACQUIRED',
      quantity: params.quantity,
      quantityBefore: qtyBefore,
      quantityAfter: qtyAfter,
      sourceEventId: params.sourceEventId,
      evidenceNotes: params.notes,
      occurredAt: params.occurredAt
    }
  });

  // 2. Upsert inventory projection
  await tx.userPowerUpInventory.upsert({
    where: { userId_powerUpId: { userId: params.userId, powerUpId: catalogItem.id } },
    update: {
      quantity: qtyAfter,
      totalAcquired: { increment: params.quantity },
      lastAcquiredAt: params.occurredAt
    },
    create: {
      userId: params.userId,
      powerUpId: catalogItem.id,
      quantity: qtyAfter,
      totalAcquired: params.quantity,
      totalUsed: 0,
      lastAcquiredAt: params.occurredAt
    }
  });
}
```

### Atomic Usage Handler:
```typescript
async function recordPowerUpUsage(
  tx: PrismaTransaction,
  params: {
    userId: string;
    powerUpCode: string;
    quantity: number;
    sessionId?: string;
    battleId?: string;
    sourceEventId: string;
    notes: string;
    occurredAt: Date;
  }
) {
  const catalogItem = await tx.powerUpCatalog.findUniqueOrThrow({
    where: { code: params.powerUpCode }
  });

  const inventory = await tx.userPowerUpInventory.findUnique({
    where: { userId_powerUpId: { userId: params.userId, powerUpId: catalogItem.id } }
  });

  const qtyBefore = inventory ? inventory.quantity : 0;
  // Strictly prevent negative balance
  const qtyAfter = Math.max(0, qtyBefore - params.quantity);
  const actualDeduction = qtyBefore - qtyAfter;

  // Insert immutable transaction
  await tx.powerUpTransaction.create({
    data: {
      userId: params.userId,
      powerUpId: catalogItem.id,
      streamSessionId: params.sessionId,
      battleSessionId: params.battleId,
      transactionType: actualDeduction > 0 ? 'USED' : 'UNKNOWN',
      quantity: -actualDeduction,
      quantityBefore: qtyBefore,
      quantityAfter: qtyAfter,
      sourceEventId: params.sourceEventId,
      evidenceNotes: params.notes,
      occurredAt: params.occurredAt
    }
  });

  if (actualDeduction > 0) {
    await tx.userPowerUpInventory.update({
      where: { userId_powerUpId: { userId: params.userId, powerUpId: catalogItem.id } },
      data: {
        quantity: qtyAfter,
        totalUsed: { increment: actualDeduction },
        lastUsedAt: params.occurredAt
      }
    });
  }
}
```

---

## 5. Weekly Battle Tools Archive & Snapshot Rollups

- Every Sunday at 23:59:59 UTC (Monday 02:59:59 Asia/Riyadh), the weekly rollup worker computes weekly summaries from `power_up_transactions`:
  - `total_acquired`: Sum of positive transaction quantities within the 7-day period.
  - `total_used`: Absolute sum of negative usage quantities within the 7-day period.
  - `balance_remaining`: Final balance at week close.
- Result is persisted to `weekly_power_up_snapshots`.
- The dashboard allows switching between weekly snapshots and live computed balance without losing audit traceability.

---

## 6. Real-Time Alerts & Notification Triggers

When a power-up usage transaction occurs:
1. Event is validated against active battle session.
2. Watchlist engine checks if the deploying user or target streamer is flagged for `notify_powerups`.
3. Dispatches high-priority WebSocket frame:
   ```json
   {
     "type": "POWERUP_ALERT",
     "severity": "HIGH",
     "timestamp": "2026-09-20T04:45:12Z",
     "streamerId": "streamer_uuid",
     "battleId": "BATTLE_184",
     "user": {
       "userId": "12345678",
       "uniqueId": "Ahmed_VIP",
       "nickname": "أحمد الشمري"
     },
     "powerUp": {
       "code": "GLOVES",
       "nameAr": "قفازات المعركة",
       "icon": "gloves.png"
     },
     "remainingQuantity": 2,
     "message": "⚡ تم تفعيل قفازات المعركة بواسطة @Ahmed_VIP في الجولة #184 (المتبقي: 2)"
   }
   ```
