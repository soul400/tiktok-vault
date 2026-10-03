import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();
const prisma = new PrismaClient();

const items = [
  { code: 'GLOVES', nameAr: 'قفازات المعركة (الضربة القاضية)', nameEn: 'Battle Gloves', multiplier: 5.0, durationSeconds: 30, iconName: 'boxing-glove' },
  { code: 'MIST', nameAr: 'ضباب المعركة (حجب النقاط)', nameEn: 'Fog of War / Mist', multiplier: 1.0, durationSeconds: 30, iconName: 'cloud-fog' },
  { code: 'THUNDER', nameAr: 'صاعقة الرعد', nameEn: 'Thunder Strike', multiplier: 1.0, durationSeconds: 0, iconName: 'zap' },
  { code: 'BOOST_X2', nameAr: 'مضاعف النقاط ×2', nameEn: 'Point Multiplier x2', multiplier: 2.0, durationSeconds: 30, iconName: 'chevrons-up' },
  { code: 'BOOST_X3', nameAr: 'مضاعف النقاط ×3', nameEn: 'Point Multiplier x3', multiplier: 3.0, durationSeconds: 30, iconName: 'flame' },
  { code: 'EXTRA_TIME', nameAr: 'الوقت الإضافي', nameEn: 'Extra Battle Time', multiplier: 1.0, durationSeconds: 15, iconName: 'clock' },
  { code: 'MATCH_GUIDE', nameAr: 'دليل استراتيجية المعركة', nameEn: 'Match Strategy Guide', multiplier: 1.0, durationSeconds: 0, iconName: 'book-open' },
];

async function update() {
  for (const item of items) {
    await prisma.powerUpCatalog.upsert({
      where: { code: item.code },
      update: {
        nameAr: item.nameAr,
        nameEn: item.nameEn,
        multiplier: item.multiplier,
        durationSeconds: item.durationSeconds,
      },
      create: {
        code: item.code,
        nameAr: item.nameAr,
        nameEn: item.nameEn,
        type: 'MULTIPLIER',
        multiplier: item.multiplier,
        durationSeconds: item.durationSeconds,
        iconName: item.iconName,
        assetUrl: `/assets/powerups/${item.code.toLowerCase()}.png`,
        isActive: true,
      },
    });
  }
  console.log('✅ Catalog updated successfully with clean Arabic strings.');
  await prisma.$disconnect();
}

update().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
