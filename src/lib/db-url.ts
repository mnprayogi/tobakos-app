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

function tlsRequested(url: URL): boolean {
  const sslMode = (url.searchParams.get("ssl-mode") ?? "").toLowerCase()
  const params = [sslMode, (url.searchParams.get("ssl") ?? "").toLowerCase()]
  return params.some((value) =>
    ["true", "1", "required", "require", "enabled", "verify-ca", "verify-full"].includes(value)
  )
}

/**
 * Membangun koneksi config mariadb dari DATABASE_URL + env SSL cloud.
 * Dipakai db.ts (Prisma adapter) dan route backup/import (koneksi raw).
 *
 * TLS diaktifkan bila: `DATABASE_SSL_CA` diset (verifikasi CA), atau URL meminta
 * TLS (`ssl=true` / `ssl-mode=REQUIRED`) — menyusul perilaku `?ssl=true` milik
 * driver mariadb yang hanya mengenali `ssl=true`, bukan `ssl-mode=REQUIRED`.
 */
export function buildConnectionConfig(rawUrl: string): ConnectionConfig {
  const url = new URL(rawUrl)
  const config: ConnectionConfig = {
    host: normalizeHost(url.hostname),
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
  } else if (tlsRequested(url)) {
    config.ssl = true
  }

  return config
}

/**
 * Resolusi `localhost` di driver mariadb pada runtime `next dev` memilih IPv6
 * `::1` dan koneksi pertamanya bisa menggantung puluhan detik di proses dev
 * server (setiap restart). Paksa memakai `127.0.0.1` (IPv4) untuk host
 * lokal — koneksi jadi instan dan perilaku identik di semua OS/runtime.
 * Host non-lokal (Aiven, gudang via LAN IP) tidak disentuh.
 */
function normalizeHost(host: string): string {
  const lower = host.toLowerCase()
  if (lower === "localhost" || lower === "::1" || lower === "[::1]") {
    return "127.0.0.1"
  }
  return host
}