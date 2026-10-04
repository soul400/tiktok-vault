const { getPrisma } = require('./dist/index.js');
const prisma = getPrisma();

async function calibrateSupporter(uniqueId, toolTargets, reason = 'Initial inventory calibration') {
  const user = await prisma.user.findFirst({
    where: { uniqueId }
  });

  if (!user) {
    console.error(`User @${uniqueId} not found!`);
    return;
  }

  console.log(`Calibrating tools for @${uniqueId} (${user.id})...`);

  for (const [code, targetQty] of Object.entries(toolTargets)) {
    const powerUp = await prisma.powerUpCatalog.findUnique({
      where: { code }
    });

    if (!powerUp) {
      console.warn(`PowerUp code ${code} not found in catalog!`);
      continue;
    }

    const currentInv = await prisma.userPowerUpInventory.findUnique({
      where: {
        userId_powerUpId: {
          userId: user.id,
          powerUpId: powerUp.id
        }
      }
    });

    const currentQty = currentInv ? currentInv.quantity : 0;
    const diff = targetQty - currentQty;

    if (diff === 0) {
      console.log(`- ${code}: already at ${targetQty}`);
      continue;
    }

    console.log(`- ${code}: adjusting from ${currentQty} -> ${targetQty} (diff: ${diff > 0 ? '+' : ''}${diff})`);

    // Insert immutable transaction
    await prisma.powerUpTransaction.create({
      data: {
        userId: user.id,
        powerUpId: powerUp.id,
        transactionType: 'ADJUSTED',
        quantity: diff,
        quantityBefore: currentQty,
        quantityAfter: targetQty,
        evidenceNotes: `${reason} | Target: ${targetQty}`,
        occurredAt: new Date()
      }
    });

    // Update inventory projection
    await prisma.userPowerUpInventory.upsert({
      where: {
        userId_powerUpId: {
          userId: user.id,
          powerUpId: powerUp.id
        }
      },
      update: {
        quantity: targetQty,
        totalAcquired: { increment: Math.max(0, diff) },
        updatedAt: new Date()
      },
      create: {
        userId: user.id,
        powerUpId: powerUp.id,
        quantity: targetQty,
        totalAcquired: targetQty,
        totalUsed: 0
      }
    });
  }

  console.log(`✓ Completed calibration for @${uniqueId}!`);
}

async function run() {
  await calibrateSupporter('3ze525', {
    GLOVES: 14,
    BOOST_X3: 3,
    BOOST_X2: 7,
    MIST: 2,
    EXTRA_TIME: 1
  }, 'Verified TikTok backpack initial balance');
}

run()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
