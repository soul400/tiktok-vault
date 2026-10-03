import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import { seedCatalog } from './seed.js';

dotenv.config({ path: '../../.env' });
dotenv.config();

const prisma = new PrismaClient();

export async function resetDatabase() {
  console.log('🔄 Starting complete database reset...');

  // Delete in cascading / foreign key order
  console.log('Clearing runtime events and transactions...');
  await prisma.powerUpTransaction.deleteMany({});
  await prisma.userPowerUpInventory.deleteMany({});
  await prisma.weeklyPowerUpSnapshot.deleteMany({});

  await prisma.battleEvent.deleteMany({});
  await prisma.battleParticipant.deleteMany({});
  await prisma.battleSession.deleteMany({});

  await prisma.commentEvent.deleteMany({});
  await prisma.likeEvent.deleteMany({});
  await prisma.shareEvent.deleteMany({});
  await prisma.giftEvent.deleteMany({});
  await prisma.joinEvent.deleteMany({});
  await prisma.liveEvent.deleteMany({});

  await prisma.userSessionStats.deleteMany({});
  await prisma.streamSessionStats.deleteMany({});
  await prisma.liveSession.deleteMany({});

  await prisma.watchlist.deleteMany({});
  await prisma.user.deleteMany({});

  console.log('Resetting Tracked Streamers...');
  await prisma.trackedStreamer.deleteMany({});

  // Seed default clean streamer
  await prisma.trackedStreamer.create({
    data: {
      username: 'mohra.2000',
      uniqueId: 'mohra.2000',
      displayName: 'المهره 💛',
      profileImage: null,
      isActive: true,
      monitoringEnabled: true,
      status: 'OFFLINE',
      lastLiveAt: null,
      lastOfflineAt: null,
    },
  });

  console.log('Re-seeding catalogs...');
  await seedCatalog();

  console.log('✅ Database reset completed successfully! Everything is brand new.');
}

resetDatabase()
  .catch((e) => {
    console.error('❌ Error resetting database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
