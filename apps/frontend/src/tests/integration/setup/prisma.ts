import { PrismaClient } from '@prisma/client';

let prismaInstance: PrismaClient | null = null;

export function getTestPrisma(): PrismaClient {
  if (!prismaInstance) {
    prismaInstance = new PrismaClient({
      datasources: { db: { url: process.env.DATABASE_URL } },
    });
  }
  return prismaInstance;
}

export async function disconnectTestPrisma(): Promise<void> {
  if (prismaInstance) {
    await prismaInstance.$disconnect();
    prismaInstance = null;
  }
}
