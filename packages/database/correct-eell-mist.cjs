const { getPrisma } = require('./dist/index.js');
const prisma = getPrisma();

async function correctEellMist() {
  const user = await prisma.user.findFirst({
    where: { uniqueId: 'eell_44' }
  });

  if (!user) {
    console.error('User eell_44 not found!');
    return;
  }

  const mistCatalog = await prisma.powerUpCatalog.findUnique({
    where: { code: 'MIST' }
  });
  const gloveCatalog = await prisma.powerUpCatalog.findUnique({
    where: { code: 'GLOVES' }
  });

  console.log(`Fixing false glove -> 2 mist for @eell_44 (${user.id})...`);

  // 1. Update the misclassified transaction to MIST with quantity 2
  const targetTxId = '31259b51-ae86-4230-b27e-6ec260e9e387';
  await prisma.powerUpTransaction.update({
    where: { id: targetTxId },
    data: {
      powerUpId: mistCatalog.id,
      quantity: 2,
      quantityBefore: 0,
      quantityAfter: 2,
      evidenceNotes: 'Corrected: Live item card: MIST (ACQUIRED x2) for eell_44 (Speed challenge reward)',
    }
  });
  console.log(`✓ Updated transaction ${targetTxId} to MIST x2`);

  // 2. Also update liveEvent payload
  await prisma.liveEvent.updateMany({
    where: { providerEventId: { contains: '7692803044891413256_6918232298644505601' } },
    data: {
      payloadJson: {
        battleId: "7692801727028726534",
        quantity: 2,
        multiplier: 1,
        actionState: "ACQUIRED",
        powerUpCode: "MIST",
        powerUpName: "ضباب المعركة",
        evidenceNotes: "Live item card: MIST (ACQUIRED x2) for eell_44",
        durationSeconds: 30
      }
    }
  });
  console.log(`✓ Updated liveEvent payload`);

  // 3. Rebuild user inventory for eell_44 from the transaction ledger
  const allUserTxs = await prisma.powerUpTransaction.findMany({
    where: { userId: user.id },
    include: { powerUp: true }
  });

  // Calculate per tool
  const toolStats = {};
  for (const tx of allUserTxs) {
    const code = tx.powerUp.code;
    if (!toolStats[code]) {
      toolStats[code] = { powerUpId: tx.powerUpId, acquired: 0, used: 0, balance: 0 };
    }
    if (tx.quantity > 0) {
      toolStats[code].acquired += tx.quantity;
      toolStats[code].balance += tx.quantity;
    } else {
      const deduction = Math.abs(tx.quantity);
      toolStats[code].used += deduction;
      toolStats[code].balance = Math.max(0, toolStats[code].balance - deduction);
    }
  }

  for (const [code, stats] of Object.entries(toolStats)) {
    await prisma.userPowerUpInventory.upsert({
      where: {
        userId_powerUpId: {
          userId: user.id,
          powerUpId: stats.powerUpId
        }
      },
      update: {
        quantity: stats.balance,
        totalAcquired: stats.acquired,
        totalUsed: stats.used,
        updatedAt: new Date()
      },
      create: {
        userId: user.id,
        powerUpId: stats.powerUpId,
        quantity: stats.balance,
        totalAcquired: stats.acquired,
        totalUsed: stats.used
      }
    });
    console.log(`✓ User inventory for ${code}: available = ${stats.balance}, acquired = ${stats.acquired}, used = ${stats.used}`);
  }

  console.log('✓ Successfully reconciled @eell_44!');
}

correctEellMist()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
