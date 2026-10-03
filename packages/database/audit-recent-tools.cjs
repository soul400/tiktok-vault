const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function auditRecordedTools() {
  console.log('=== AUDITING RECORDED POWER-UP TRANSACTIONS ===\n');

  const transactions = await prisma.powerUpTransaction.findMany({
    orderBy: { occurredAt: 'desc' },
    take: 30,
    include: { user: true, powerUp: true, battleSession: true }
  });

  console.log(`Found ${transactions.length} recent transactions:`);
  for (const tx of transactions) {
    console.log(`[${tx.occurredAt.toISOString()}] ${tx.transactionType} | Tool: ${tx.powerUp?.code} (${tx.powerUp?.nameAr}) | Qty: ${tx.quantity} | User: @${tx.user?.uniqueId} (${tx.user?.nickname})`);
    console.log(`   Evidence Notes: ${tx.evidenceNotes}`);
  }

  console.log('\n=== AUDITING SUPPORTER INVENTORIES ===\n');
  const inventories = await prisma.userPowerUpInventory.findMany({
    where: { OR: [{ quantity: { gt: 0 } }, { totalAcquired: { gt: 0 } }] },
    include: { user: true, powerUp: true }
  });

  for (const inv of inventories) {
    console.log(`User: @${inv.user?.uniqueId} | Tool: ${inv.powerUp?.code} (${inv.powerUp?.nameAr}) | Available: ${inv.quantity} | TotalAcq: ${inv.totalAcquired} | TotalUsed: ${inv.totalUsed}`);
  }

  await prisma.$disconnect();
}

auditRecordedTools().catch(console.error);
