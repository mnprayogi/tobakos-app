import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { generateSqlDump } from "@/lib/database-dump"
import { parseDatabaseUrl } from "@/lib/db-url"
import { execFile } from "node:child_process"
import { promisify } from "node:util"
import { existsSync, readdirSync } from "node:fs"
import { mkdtemp, readFile, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"

const execFileAsync = promisify(execFile)

export const maxDuration = 60

const isWin = process.platform === "win32"
const BIN_NAMES = isWin ? ["mysqldump.exe", "mariadb-dump.exe"] : ["mysqldump", "mariadb-dump"]

function findDumpBinary(): string | null {
  const envPath = process.env.MYSQLDUMP_PATH
  if (envPath && existsSync(/* turbopackIgnore: true */ envPath)) return envPath

  const pathDirs = (process.env.PATH ?? "").split(isWin ? ";" : ":")
  for (const dir of pathDirs) {
    if (!dir) continue
    for (const name of BIN_NAMES) {
      const candidate = join(/* turbopackIgnore: true */ dir, name)
      if (existsSync(/* turbopackIgnore: true */ candidate)) return candidate
    }
  }

  const roots = isWin
    ? ["C:\\Program Files\\MariaDB", "C:\\Program Files\\MySQL", "C:\\Program Files (x86)\\MariaDB", "C:\\Program Files (x86)\\MySQL"]
    : ["/usr/bin", "/usr/local/bin", "/usr/bin/mysql", "/opt/lamp/bin", "/opt/lampp/bin"]
  for (const root of roots) {
    if (!existsSync(/* turbopackIgnore: true */ root)) continue
    const lookup = isWin ? [root, ...readdirSync(/* turbopackIgnore: true */ root).map((d) => join(/* turbopackIgnore: true */ root, d))] : [root]
    for (const dir of lookup) {
      const binDir = isWin ? join(/* turbopackIgnore: true */ dir, "bin") : dir
      if (!existsSync(/* turbopackIgnore: true */ binDir)) continue
      for (const name of BIN_NAMES) {
        const candidate = join(/* turbopackIgnore: true */ binDir, name)
        if (existsSync(/* turbopackIgnore: true */ candidate)) return candidate
      }
    }
  }
  return null
}

function isAdmin(role: unknown): boolean {
  return role === "ADMIN" || role === "SUPER_ADMIN"
}

function stamp(): string {
  return new Date().toISOString().replace(/[-:T]/g, "").slice(0, 14)
}

function downloadResponse(buffer: Uint8Array, database: string): NextResponse {
  const filename = `${database}_backup_${stamp()}.sql`
  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/sql",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String(buffer.byteLength),
    },
  })
}

export async function GET() {
  const session = await auth()
  if (!isAdmin(session?.user?.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const dbUrl = process.env.DATABASE_URL
  if (!dbUrl) {
    return NextResponse.json({ error: "DATABASE_URL tidak ditemukan" }, { status: 500 })
  }

  const creds = parseDatabaseUrl(dbUrl)
  if (!creds.database) {
    return NextResponse.json({ error: "Nama database tidak valid di DATABASE_URL" }, { status: 500 })
  }

  const binary = findDumpBinary()
  if (!binary) {
    try {
      const sql = await generateSqlDump(creds.database)
      return downloadResponse(Buffer.from(sql, "utf8"), creds.database)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      return NextResponse.json({ error: `Backup gagal: ${message}` }, { status: 500 })
    }
  }

  const tempDir = await mkdtemp(join(tmpdir(), "tobakos-backup-"))
  const dumpPath = join(tempDir, "backup.sql")

  const args = [
    `--host=${creds.host}`,
    `--port=${creds.port}`,
    `--user=${creds.user}`,
  ]
  if (creds.password) args.push(`--password=${creds.password}`)
  args.push(
    "--single-transaction",
    "--routines",
    "--triggers",
    "--skip-lock-tables",
    `--result-file=${dumpPath}`,
    creds.database
  )

  try {
    await execFileAsync(binary, args, {
      timeout: 300_000,
      maxBuffer: 1024 * 1024 * 64,
      windowsHide: true,
    })
  } catch (err) {
    await rm(tempDir, { recursive: true, force: true }).catch(() => {})
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: `Backup gagal: ${message}` }, { status: 500 })
  }

  const buffer = await readFile(dumpPath).catch(() => null)
  await rm(tempDir, { recursive: true, force: true }).catch(() => {})

  if (!buffer) {
    return NextResponse.json({ error: "Gagal membaca hasil backup" }, { status: 500 })
  }

  return downloadResponse(buffer, creds.database)
}