const { PrismaClient } = require('@prisma/client');
require('dotenv').config({ path: '../../apps/api/.env' });
const prisma = new PrismaClient();

async function main() {
  const inv = await prisma.userPowerUpInventory.findMany({
    include: { user: true, powerUp: true },
    orderBy: { quantity: 'desc' }
  });
  console.log('Inventories count:', inv.length);
  inv.forEach(i => console.log({
    user: i.user?.uniqueId,
    nickname: i.user?.nickname,
    tool: i.powerUp?.nameAr,
    code: i.powerUp?.code,
    avail: i.quantity,
    total: i.totalAcquired,
    used: i.totalUsed,
    updatedAt: i.updatedAt
  }));
}

main().finally(() => prisma.$disconnect());
