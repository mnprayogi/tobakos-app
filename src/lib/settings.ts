import { prisma } from "./db"

const cache = new Map<string, string>()
const CACHE_TTL = 60_000
const cacheExpiry = new Map<string, number>()

export async function getSetting(key: string, defaultValue: string = ""): Promise<string> {
  const now = Date.now()
  const expiry = cacheExpiry.get(key) ?? 0
  if (cache.has(key) && now < expiry) return cache.get(key)!

  const row = await prisma.systemSetting.findUnique({ where: { key } })
  const value = row?.value ?? defaultValue
  cache.set(key, value)
  cacheExpiry.set(key, now + CACHE_TTL)
  return value
}

export async function getSettingNumber(key: string, defaultValue: number): Promise<number> {
  const raw = await getSetting(key, String(defaultValue))
  const n = Number(raw)
  return Number.isFinite(n) ? n : defaultValue
}

export function invalidateSetting(key?: string) {
  if (key) {
    cache.delete(key)
    cacheExpiry.delete(key)
  } else {
    cache.clear()
    cacheExpiry.clear()
  }
}
