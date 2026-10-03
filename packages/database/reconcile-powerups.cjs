const { PrismaClient } = require('@prisma/client');
require('dotenv').config({ path: '../../apps/api/.env' });
const prisma = new PrismaClient();

async function main() {
  console.log('--- Reconciling Power-Up Transactions and Inventories ---');

  // 1. Fetch all transactions
  const allTxs = await prisma.powerUpTransaction.findMany({
    include: { powerUp: true, user: true }
  });

  console.log(`Found ${allTxs.length} transactions.`);

  // 2. Fix UNKNOWN transactions that were usages
  let fixedCount = 0;
  for (const tx of allTxs) {
    if (tx.transactionType === 'UNKNOWN') {
      await prisma.powerUpTransaction.update({
        where: { id: tx.id },
        data: {
          transactionType: 'USED',
          quantity: -1,
        }
      });
      fixedCount++;
    }
  }
  console.log(`Converted ${fixedCount} UNKNOWN transactions to USED.`);

  // 3. Re-fetch all updated transactions
  const updatedTxs = await prisma.powerUpTransaction.findMany({
    include: { powerUp: true, user: true }
  });

  // 4. Group by userId and powerUpId
  const userPowerUpMap = new Map();
  for (const tx of updatedTxs) {
    const key = `${tx.userId}_${tx.powerUpId}`;
    if (!userPowerUpMap.has(key)) {
      userPowerUpMap.set(key, {
        userId: tx.userId,
        powerUpId: tx.powerUpId,
        acquired: 0,
        used: 0,
        lastAcquiredAt: tx.occurredAt,
        lastUsedAt: null,
      });
    }

    const entry = userPowerUpMap.get(key);
    if (tx.transactionType === 'ACQUIRED') {
      entry.acquired += Math.abs(tx.quantity) || 1;
      if (new Date(tx.occurredAt) > new Date(entry.lastAcquiredAt)) {
        entry.lastAcquiredAt = tx.occurredAt;
      }
    } else if (tx.transactionType === 'USED') {
      entry.used += Math.abs(tx.quantity) || 1;
      if (!entry.lastUsedAt || new Date(tx.occurredAt) > new Date(entry.lastUsedAt)) {
        entry.lastUsedAt = tx.occurredAt;
      }
    }
  }

  // 5. Upsert accurate inventories for all users and tools
  for (const [key, data] of userPowerUpMap.entries()) {
    // If a user used an item that wasn't captured on acquisition, totalAcquired >= totalUsed
    const totalAcquired = Math.max(data.acquired, data.used);
    const quantity = Math.max(0, data.acquired - data.used);

    await prisma.userPowerUpInventory.upsert({
      where: {
        userId_powerUpId: {
          userId: data.userId,
          powerUpId: data.powerUpId,
        }
      },
      update: {
        quantity,
        totalAcquired,
        totalUsed: data.used,
        lastAcquiredAt: data.lastAcquiredAt,
        lastUsedAt: data.lastUsedAt,
      },
      create: {
        userId: data.userId,
        powerUpId: data.powerUpId,
        quantity,
        totalAcquired,
        totalUsed: data.used,
        lastAcquiredAt: data.lastAcquiredAt,
        lastUsedAt: data.lastUsedAt,
      }
    });
  }

  console.log(`Reconciled ${userPowerUpMap.size} user inventory projections.`);

  // 6. Print summary of all user inventories
  const invs = await prisma.userPowerUpInventory.findMany({
    include: { user: true, powerUp: true },
    orderBy: { updatedAt: 'desc' }
  });

  console.log('\n--- Updated User Inventory Summary ---');
  invs.forEach(i => {
    console.log(`User: @${i.user?.uniqueId.padEnd(14)} Tool: ${i.powerUp?.code.padEnd(10)} Avail: ${i.quantity} | Used: ${i.totalUsed} | Acquired: ${i.totalAcquired}`);
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
