import { PrismaClient, PowerUpType } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();
const prisma = new PrismaClient();

const DEFAULT_POWERUPS = [
  {
    code: 'GLOVES',
    nameAr: 'قفازات المعركة',
    nameEn: 'Battle Gloves',
    type: PowerUpType.MULTIPLIER,
    multiplier: 5.0,
    durationSeconds: 30,
    iconName: 'boxing-glove',
    assetUrl: '/assets/powerups/gloves.png',
  },
  {
    code: 'MIST',
    nameAr: 'ضباب المعركة',
    nameEn: 'Fog of War / Mist',
    type: PowerUpType.OBFUSCATION,
    multiplier: 1.0,
    durationSeconds: 30,
    iconName: 'cloud-fog',
    assetUrl: '/assets/powerups/mist.png',
  },
  {
    code: 'THUNDER',
    nameAr: 'صاعقة الرعد',
    nameEn: 'Thunder Strike',
    type: PowerUpType.STRIKE,
    multiplier: 1.0,
    durationSeconds: 0,
    iconName: 'zap',
    assetUrl: '/assets/powerups/thunder.png',
  },
  {
    code: 'BOOST_X2',
    nameAr: 'مضاعف النقاط x2',
    nameEn: 'Point Multiplier x2',
    type: PowerUpType.MULTIPLIER,
    multiplier: 2.0,
    durationSeconds: 30,
    iconName: 'chevrons-up',
    assetUrl: '/assets/powerups/boost_x2.png',
  },
  {
    code: 'BOOST_X3',
    nameAr: 'مضاعف النقاط x3',
    nameEn: 'Point Multiplier x3',
    type: PowerUpType.MULTIPLIER,
    multiplier: 3.0,
    durationSeconds: 30,
    iconName: 'flame',
    assetUrl: '/assets/powerups/boost_x3.png',
  },
  {
    code: 'EXTRA_TIME',
    nameAr: 'وقت إضافي',
    nameEn: 'Extra Battle Time',
    type: PowerUpType.TIME_EXTENSION,
    multiplier: 1.0,
    durationSeconds: 15,
    iconName: 'clock',
    assetUrl: '/assets/powerups/extra_time.png',
  },
  {
    code: 'MATCH_GUIDE',
    nameAr: 'دليل المعركة',
    nameEn: 'Match Strategy Guide',
    type: PowerUpType.STRATEGY,
    multiplier: 1.0,
    durationSeconds: 0,
    iconName: 'book-open',
    assetUrl: '/assets/powerups/guide.png',
  },
];

const DEFAULT_GIFTS = [
  { giftId: '5655', name: 'Rose', diamondValue: 1, category: 'Basic' },
  { giftId: '5827', name: 'TikTok', diamondValue: 1, category: 'Basic' },
  { giftId: '5269', name: 'Finger Heart', diamondValue: 5, category: 'Popular' },
  { giftId: '6064', name: 'Doughnut', diamondValue: 30, category: 'Popular' },
  { giftId: '5659', name: 'Confetti', diamondValue: 100, category: 'Festive' },
  { giftId: '6038', name: 'Boxing Gloves', diamondValue: 299, category: 'Battle' },
  { giftId: '5585', name: 'Swan', diamondValue: 699, category: 'Luxury' },
  { giftId: '5487', name: 'Whale Diving', diamondValue: 2150, category: 'Mega' },
  { giftId: '5658', name: 'Leon the Kitten', diamondValue: 4888, category: 'Mega' },
  { giftId: '5962', name: 'TikTok Universe', diamondValue: 34999, category: 'Legendary' },
];

export async function seedCatalog() {
  console.log('Seeding PowerUp Catalog...');
  for (const p of DEFAULT_POWERUPS) {
    await prisma.powerUpCatalog.upsert({
      where: { code: p.code },
      update: p,
      create: p,
    });
  }

  console.log('Seeding Default Gift Catalog...');
  for (const g of DEFAULT_GIFTS) {
    await prisma.giftCatalog.upsert({
      where: { giftId: g.giftId },
      update: { name: g.name, diamondValue: g.diamondValue, category: g.category },
      create: { giftId: g.giftId, name: g.name, diamondValue: g.diamondValue, category: g.category },
    });
  }

  console.log('Catalog seeding complete.');
}

if (process.argv[1]?.includes('seed.ts')) {
  seedCatalog()
    .catch((err) => {
      console.error(err);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
