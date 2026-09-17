import { PrismaClient } from "@/generated/prisma/client"
import { PrismaMariaDb } from "@prisma/adapter-mariadb"
import { Prisma } from "@/generated/prisma/client"
import { buildConnectionConfig } from "@/lib/db-url"

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

type PrismaMariaDbCtor = ConstructorParameters<typeof PrismaMariaDb>[0]

function intFromEnv(key: string, fallback: number): number {
  const raw = process.env[key]
  if (!raw) return fallback
  const parsed = Number.parseInt(raw, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

/**
 * Config pool di-bangun eksplisit (bukan pass URL mentah) karena driver mariadb
 * memakai default yang terlalu ketat di serverless: connectTimeout 1.000 ms dan
 * idleTimeout 30 menit. Di Lambda/Vercel, socket beku antar request harus
 * "di-reap" cepat (idleTimeout rendah) dan connect/acquisition diberi waktu
 * lebih agar cold-start / jeda singkat tidak jadi error login.
 */
function buildPoolConfig(rawUrl: string): PrismaMariaDbCtor {
  return {
    ...buildConnectionConfig(rawUrl),
    connectionLimit: intFromEnv("DATABASE_POOL_CONNECTION_LIMIT", 10),
    connectTimeout: intFromEnv("DATABASE_POOL_CONNECT_TIMEOUT", 30_000),
    acquireTimeout: intFromEnv("DATABASE_POOL_ACQUIRE_TIMEOUT", 30_000),
    idleTimeout: intFromEnv("DATABASE_POOL_IDLE_TIMEOUT", 60),
    minimumIdle: 2,
  } as PrismaMariaDbCtor
}

function createPrismaClient() {
  const rawUrl = process.env.DATABASE_URL
  if (!rawUrl) {
    throw new Error("DATABASE_URL is not set — cannot initialize Prisma client")
  }
  const adapter = new PrismaMariaDb(buildPoolConfig(rawUrl))
  return new PrismaClient({
    adapter,
    transactionOptions: { maxWait: 10000, timeout: 20000 },
  })
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma

/**
 * Pre-warm: bentuk koneksi pertama lebih dulu secara asinkron (100ms setelah
 * modul db dimuat, mis. saat /login dirender) supaya permintaan login langsung
 * menemukan pool hangat — penting di cold-start Lambda/Vercel dan di saat
 * pool baru dibuat di dev server. Koneksi pertama itu dibiarkan gagal diam-diam
 * bila DB belum siap (mis. saat failover); request berikutnya tetap jalan.
 */
void setTimeout(() => {
  void prisma.$queryRaw`SELECT 1`.catch(() => {})
}, 100)

export type Decimal = Prisma.Decimal