// ============================================================================
// DispatchGrid — Prisma Client Singleton
// Ensures a single database connection pool across the application.
// ============================================================================

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

export default prisma;

