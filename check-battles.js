const { PrismaClient } = require('@prisma/client');
require('dotenv').config({ path: './apps/api/.env' });
const prisma = new PrismaClient();

async function check() {
  const battles = await prisma.battle.findMany({
    take: 3,
    orderBy: { startedAtUtc: 'desc' },
    include: { participants: { include: { user: true } } }
  });
  for (const b of battles) {
    console.log('--- BATTLE ---');
    console.log('ID:', b.id, 'ExternalId:', b.externalBattleId, 'Status:', b.status);
    console.log('Scores: TeamA =', b.teamAScore.toString(), 'TeamB =', b.teamBScore.toString());
    console.log('Participants:');
    for (const p of b.participants) {
      console.log(`  [${p.teamId}] @${p.user?.uniqueId} (${p.user?.displayName}) - score: ${p.score.toString()}`);
    }
  }
}

check()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
