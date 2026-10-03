const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function dumpRawCardMessages() {
  const events = await prisma.liveEvent.findMany({
    where: {
      OR: [
        { providerEventType: { contains: 'Card', mode: 'insensitive' } },
        { providerEventType: { contains: 'Item', mode: 'insensitive' } },
        { eventType: { contains: 'POWERUP', mode: 'insensitive' } },
      ]
    },
    orderBy: { timestampUtc: 'desc' },
    take: 10
  });

  console.log(`Found ${events.length} raw card events:`);
  for (const ev of events) {
    console.log(`\n======================================================`);
    console.log(`TIME: ${ev.timestampUtc.toISOString()} | TYPE: ${ev.providerEventType} | ID: ${ev.id}`);
    console.log(`EVENT_TYPE: ${ev.eventType}`);
    console.log(`PAYLOAD JSON:`);
    console.log(JSON.stringify(ev.payloadJson, null, 2));
  }

  await prisma.$disconnect();
}

dumpRawCardMessages().catch(console.error);
