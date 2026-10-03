import { PrismaClient } from '@prisma/client';

let globalPrisma: PrismaClient | undefined;

export function getPrisma(): PrismaClient {
  if (!globalPrisma) {
    globalPrisma = new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
    });
  }
  return globalPrisma;
}

export * from '@prisma/client';
export * from './seed.js';
