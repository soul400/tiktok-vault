const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function findMisclassified() {
  const txs = await prisma.powerUpTransaction.findMany({
    where: {
      transactionType: 'ACQUIRED',
      OR: [
        { evidenceNotes: { contains: 'BOOST_X3 (ACQUIRED' } },
        { evidenceNotes: { contains: 'MATCH_GUIDE (ACQUIRED' } },
      ]
    },
    include: { user: true, powerUp: true }
  });

  console.log(`Found ${txs.length} misclassified acquisitions:`);
  for (const t of txs) {
    console.log(`- ID: ${t.id} | User: @${t.user.uniqueId} | Tool: ${t.powerUp.code} | Qty: ${t.quantity} | Note: ${t.evidenceNotes}`);
  }

  await prisma.$disconnect();
}

findMisclassified().catch(console.error);
