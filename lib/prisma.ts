/**
 * lib/prisma.ts
 * Singleton Prisma client for local SQLite.
 * Stored on globalThis to survive Next.js hot reloads in development.
 */
import { PrismaClient } from '@prisma/client';

const g = global as typeof globalThis & { _prisma?: PrismaClient };

export const prisma = g._prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  g._prisma = prisma;
}
