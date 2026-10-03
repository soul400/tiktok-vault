const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function audit() {
  console.log('=== 1. POWER-UP CATALOG AUDIT ===');
  const catalog = await prisma.powerUpCatalog.findMany();
  console.log(`Total catalog items: ${catalog.length}`);
  catalog.forEach(c => {
    console.log(`  [${c.code}] ${c.nameAr} (${c.nameEn}) - Type: ${c.type}, Mult: ${c.multiplier}x, Dur: ${c.durationSeconds}s`);
  });

  console.log('\n=== 2. AUDIT OF 5 KEY TOOLS ===');
  const targetTools = ['GLOVES', 'BOOST_X3', 'BOOST_X2', 'MIST', 'EXTRA_TIME'];

  for (const code of targetTools) {
    const cat = catalog.find(c => c.code === code);
    if (!cat) {
      console.log(`❌ Tool ${code} NOT FOUND in catalog!`);
      continue;
    }

    const inventories = await prisma.userPowerUpInventory.findMany({
      where: { powerUpId: cat.id },
      include: { user: true }
    });

    const transactions = await prisma.powerUpTransaction.findMany({
      where: { powerUpId: cat.id }
    });

    const totalRemaining = inventories.reduce((sum, i) => sum + i.quantity, 0);
    const totalAcquiredInv = inventories.reduce((sum, i) => sum + i.totalAcquired, 0);
    const totalUsedInv = inventories.reduce((sum, i) => sum + i.totalUsed, 0);

    const acquiredTx = transactions.filter(t => t.transactionType === 'ACQUIRED');
    const usedTx = transactions.filter(t => t.transactionType === 'USED');
    const unknownTx = transactions.filter(t => t.transactionType === 'UNKNOWN');

    const holdersWithPositiveBalance = inventories.filter(i => i.quantity > 0);

    console.log(`\n📌 [${code}] ${cat.nameAr}:`);
    console.log(`   - Catalog ID: ${cat.id}`);
    console.log(`   - Total Stock (Remaining): ${totalRemaining}`);
    console.log(`   - Total Acquired (from inv): ${totalAcquiredInv}`);
    console.log(`   - Total Used (from inv): ${totalUsedInv}`);
    console.log(`   - Total Transactions: ${transactions.length} (Acquired: ${acquiredTx.length}, Used: ${usedTx.length}, Unknown: ${unknownTx.length})`);
    console.log(`   - Active Holders with Balance > 0: ${holdersWithPositiveBalance.length}`);
    holdersWithPositiveBalance.slice(0, 5).forEach(h => {
      console.log(`     * @${h.user.uniqueId}: Avail=${h.quantity}, TotalAcq=${h.totalAcquired}, TotalUsed=${h.totalUsed}`);
    });
  }

  console.log('\n=== 3. VAULT API SIMULATION ===');
  const allInventories = await prisma.userPowerUpInventory.findMany({
    include: { user: true, powerUp: true }
  });

  const activeHolders = allInventories.filter(i => i.quantity > 0 && targetTools.includes(i.powerUp?.code || ''));
  console.log(`Total supporters with positive balance in the 5 tools: ${activeHolders.length}`);

  await prisma.$disconnect();
}

audit().catch(console.error);
