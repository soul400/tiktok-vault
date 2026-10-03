import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();
const prisma = new PrismaClient();

async function resetAllRecords() {
  console.log('🔄 Starting full database records reset...');

  // Delete all transactional records in proper foreign key order
  await prisma.weeklyPowerUpSnapshot.deleteMany({});
  await prisma.powerUpTransaction.deleteMany({});
  await prisma.userPowerUpInventory.deleteMany({});
  await prisma.battleEvent.deleteMany({});
  await prisma.battleParticipant.deleteMany({});
  await prisma.battleSession.deleteMany({});
  await prisma.userSessionStats.deleteMany({});
  await prisma.streamSessionStats.deleteMany({});
  await prisma.commentEvent.deleteMany({});
  await prisma.likeEvent.deleteMany({});
  await prisma.shareEvent.deleteMany({});
  await prisma.giftEvent.deleteMany({});
  await prisma.joinEvent.deleteMany({});
  await prisma.liveEvent.deleteMany({});
  await prisma.watchlist.deleteMany({});
  await prisma.liveSession.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.trackedStreamer.deleteMany({});

  console.log('✅ All historical logs, events, users, and sessions purged successfully.');

  // Verify powerups catalog is seeded
  const count = await prisma.powerUpCatalog.count();
  console.log(`📦 Battle Power-ups Catalog has ${count} items.`);

  await prisma.$disconnect();
}

resetAllRecords().catch((err) => {
  console.error('❌ Failed to reset records:', err);
  process.exit(1);
});
