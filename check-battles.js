require('dotenv').config({ path: './apps/api/.env' });
const { PrismaClient } = require('./node_modules/.pnpm/@prisma+client@6.19.3_prism_1d040ab5215f59f0e27ddee7f0cf082e/node_modules/@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const battles = await prisma.battleSession.findMany({
    take: 5,
    orderBy: { startedAt: 'desc' },
    include: {
      session: { include: { streamer: true } },
      participants: { include: { user: true } }
    }
  });
  for (const b of battles) {
    console.log('--- BATTLE ---');
    console.log('ID:', b.id, 'BattleId:', b.battleId, 'Type:', b.battleType, 'Status:', b.status);
    console.log('Streamer:', b.session?.streamer?.username);
    console.log('Participants:');
    for (const p of b.participants) {
      console.log(`  [${p.teamId}] [${p.role}] @${p.user?.uniqueId} (${p.user?.nickname}) - score: ${p.score.toString()} userId: ${p.user?.userId}`);
    }
  }
}

check()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
