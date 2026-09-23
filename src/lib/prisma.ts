import { PrismaClient } from "@prisma/client";

// Mise en cache systématique, y compris en production : en serverless
// (Vercel), chaque invocation réévalue ce module et ouvrirait sinon une
// connexion Postgres de plus, jusqu'à saturer le pool.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

globalForPrisma.prisma = prisma;
