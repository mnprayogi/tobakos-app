import type { ConnectionConfig } from "mariadb"

export interface DbCredentials {
  host: string
  port: string
  user: string
  password: string
  database: string
}

export function parseDatabaseUrl(raw: string): DbCredentials {
  const url = new URL(raw)
  return {
    host: url.hostname,
    port: url.port || "3306",
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.replace(/^\//, "") || "",
  }
}

/**
 * Membangun koneksi config mariadb dari DATABASE_URL + env SSL cloud.
 * Dipakai db.ts (Prisma adapter) dan route backup/import (koneksi raw).
 */
export function buildConnectionConfig(rawUrl: string): ConnectionConfig {
  const url = new URL(rawUrl)
  const config: ConnectionConfig = {
    host: url.hostname,
    port: Number(url.port || "3306"),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.replace(/^\//, "") || undefined,
  }

  const sslCa = process.env.DATABASE_SSL_CA
  if (sslCa) {
    const ca = sslCa.includes("-----BEGIN")
      ? sslCa
      : Buffer.from(sslCa, "base64").toString("utf8")
    config.ssl = {
      ca,
      rejectUnauthorized: process.env.DATABASE_SSL_VERIFY !== "false",
    }
  }

  return config
}