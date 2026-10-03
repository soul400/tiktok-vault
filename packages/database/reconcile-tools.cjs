const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function reconcile() {
  console.log('=== STARTING RECONCILIATION OF MISCLASSIFIED TOOLS ===\n');

  // 1. Get GLOVES catalog item
  const gloveCatalog = await prisma.powerUpCatalog.findUnique({
    where: { code: 'GLOVES' }
  });

  if (!gloveCatalog) {
    throw new Error('GLOVES catalog item not found!');
  }

  // 2. Find all 19 misclassified acquisitions
  const misclassified = await prisma.powerUpTransaction.findMany({
    where: {
      transactionType: 'ACQUIRED',
      OR: [
        { evidenceNotes: { contains: 'BOOST_X3 (ACQUIRED' } },
        { evidenceNotes: { contains: 'MATCH_GUIDE (ACQUIRED' } },
      ]
    },
    include: { user: true, powerUp: true }
  });

  console.log(`Found ${misclassified.length} transactions to convert to GLOVES...`);

  for (const tx of misclassified) {
    const updatedNote = tx.evidenceNotes
      .replace('BOOST_X3', 'GLOVES')
      .replace('MATCH_GUIDE', 'GLOVES');

    await prisma.powerUpTransaction.update({
      where: { id: tx.id },
      data: {
        powerUpId: gloveCatalog.id,
        evidenceNotes: updatedNote,
      }
    });
    console.log(`✓ Converted tx ${tx.id} for @${tx.user.uniqueId} from ${tx.powerUp.code} -> GLOVES`);
  }

  // 3. Recalculate all userPowerUpInventory projections from transaction ledger
  console.log('\n--- Recalculating all User Inventories from Ledger ---');
  await prisma.userPowerUpInventory.deleteMany();

  const allTx = await prisma.powerUpTransaction.findMany({
    include: { user: true, powerUp: true }
  });

  // Group by userId and powerUpId
  const userToolMap = new Map();

  for (const t of allTx) {
    const key = `${t.userId}_${t.powerUpId}`;
    if (!userToolMap.has(key)) {
      userToolMap.set(key, {
        userId: t.userId,
        powerUpId: t.powerUpId,
        totalAcquired: 0,
        totalUsed: 0,
        lastAcquiredAt: t.occurredAt,
        lastUsedAt: undefined,
      });
    }

    const state = userToolMap.get(key);
    if (t.transactionType === 'ACQUIRED') {
      state.totalAcquired += Math.abs(t.quantity);
      if (!state.lastAcquiredAt || new Date(t.occurredAt) > new Date(state.lastAcquiredAt)) {
        state.lastAcquiredAt = t.occurredAt;
      }
    } else if (t.transactionType === 'USED') {
      state.totalUsed += Math.abs(t.quantity);
      if (!state.lastUsedAt || new Date(t.occurredAt) > new Date(state.lastUsedAt)) {
        state.lastUsedAt = t.occurredAt;
      }
    }
  }

  // Re-insert pristine calculated inventory projections
  for (const [key, inv] of userToolMap.entries()) {
    const quantity = Math.max(0, inv.totalAcquired - inv.totalUsed);
    await prisma.userPowerUpInventory.create({
      data: {
        userId: inv.userId,
        powerUpId: inv.powerUpId,
        quantity,
        totalAcquired: inv.totalAcquired,
        totalUsed: inv.totalUsed,
        lastAcquiredAt: inv.lastAcquiredAt,
        lastUsedAt: inv.lastUsedAt,
      }
    });
  }

  console.log(`✓ Successfully rebuilt ${userToolMap.size} inventory balances!\n`);

  // Verify resulting vault
  const tools = await prisma.powerUpCatalog.findMany();
  for (const tool of tools) {
    const invs = await prisma.userPowerUpInventory.findMany({
      where: { powerUpId: tool.id }
    });
    const avail = invs.reduce((a, b) => a + b.quantity, 0);
    const acq = invs.reduce((a, b) => a + b.totalAcquired, 0);
    const used = invs.reduce((a, b) => a + b.totalUsed, 0);
    console.log(`Tool: ${tool.code} (${tool.nameAr}) -> Available: ${avail} | Acquired: ${acq} | Used: ${used}`);
  }

  console.log('\nSupporter balances with available tools:');
  const availableHolders = await prisma.userPowerUpInventory.findMany({
    where: { quantity: { gt: 0 } },
    include: { user: true, powerUp: true }
  });
  for (const h of availableHolders) {
    console.log(`  @${h.user.uniqueId} -> ${h.powerUp.code} (${h.powerUp.nameAr}): Available = ${h.quantity}`);
  }

  await prisma.$disconnect();
}

reconcile().catch(console.error);
