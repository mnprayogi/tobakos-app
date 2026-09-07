import { PrismaClient } from "@/generated/prisma/client"
import { PrismaMariaDb } from "@prisma/adapter-mariadb"
import { Prisma } from "@/generated/prisma/client"
import { buildConnectionConfig } from "@/lib/db-url"

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

type PrismaMariaDbCtor = ConstructorParameters<typeof PrismaMariaDb>[0]

function buildPoolConfig(rawUrl: string): PrismaMariaDbCtor {
  return {
    ...buildConnectionConfig(rawUrl),
    connectionLimit: 10,
  } as PrismaMariaDbCtor
}

function createPrismaClient() {
  const rawUrl = process.env.DATABASE_URL!
  const adapter = process.env.DATABASE_SSL_CA
    ? new PrismaMariaDb(buildPoolConfig(rawUrl))
    : new PrismaMariaDb(rawUrl)
  return new PrismaClient({
    adapter,
    transactionOptions: { maxWait: 5000, timeout: 10000 },
  })
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma

export type Decimal = Prisma.Decimal