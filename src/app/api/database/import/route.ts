import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { createConnection, type Connection } from "mariadb"
import { buildConnectionConfig, parseDatabaseUrl } from "@/lib/db-url"
import { splitSqlStatements } from "@/lib/sql-splitter"

export const runtime = "nodejs"
export const maxDuration = 300

const MAX_FILE_SIZE = 50 * 1024 * 1024

const DANGEROUS_PATTERNS = [
  /\bDROP\s+DATABASE\b/i,
  /\bCREATE\s+DATABASE\b/i,
  /\bUSE\b\s+\S+/i,
  /\bTRUNCATE\s+TABLE\b/i,
  /\bDROP\s+USER\b/i,
  /\bCREATE\s+USER\b/i,
  /\bALTER\s+USER\b/i,
  /\bRENAME\s+USER\b/i,
  /\bSET\s+PASSWORD\b/i,
  /\bGRANT\b\s+/i,
  /\bREVOKE\b\s+/i,
  /\bFLUSH\b/i,
  /\bSHUTDOWN\b/i,
  /\bKILL\b/i,
  /\bLOCK\s+TABLES\b/i,
  /\bUNLOCK\s+TABLES\b/i,
  /\bRESET\b/i,
  /\bCHANGE\s+MASTER\b/i,
  /\bCHANGE\s+REPLICATION\b/i,
  /\bSTART\s+SLAVE\b/i,
  /\bSTOP\s+SLAVE\b/i,
  /\bSTART\s+REPLICA\b/i,
  /\bSTOP\s+REPLICA\b/i,
]

function isAdmin(role: unknown): boolean {
  return role === "ADMIN" || role === "SUPER_ADMIN"
}

export async function POST(req: Request) {
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

  let file: File | null = null
  let confirm: string | null = null
  try {
    const form = await req.formData()
    const uploaded = form.get("file")
    if (uploaded instanceof File) file = uploaded
    const confirmField = form.get("confirm")
    if (typeof confirmField === "string") confirm = confirmField
  } catch {
    return NextResponse.json({ error: "Gagal membaca isi request" }, { status: 400 })
  }

  if (confirm !== "RESTORE") {
    return NextResponse.json(
      { error: 'Ketik "RESTORE" untuk konfirmasi import database.' },
      { status: 400 }
    )
  }

  if (!file) {
    return NextResponse.json({ error: "File .sql tidak ditemukan di request" }, { status: 400 })
  }
  if (!/\.sql$/i.test(file.name)) {
    return NextResponse.json({ error: "File harus berekstensi .sql" }, { status: 400 })
  }
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "Ukuran file maksimal 50MB. Untuk dump lebih besar gunakan import via CLI." }, { status: 400 })
  }

  const sql = await file.text()
  if (!/(CREATE TABLE|INSERT INTO)/i.test(sql)) {
    return NextResponse.json({ error: "File tidak terlihat sebagai dump SQL (tidak mengandung CREATE TABLE / INSERT INTO)" }, { status: 400 })
  }

  const statements = splitSqlStatements(sql)
  if (statements.length === 0) {
    return NextResponse.json({ error: "Tidak ada pernyataan SQL untuk dieksekusi" }, { status: 400 })
  }

  for (const stmt of statements) {
    const trimmed = stmt.trim()
    if (!trimmed) continue
    for (const pattern of DANGEROUS_PATTERNS) {
      if (pattern.test(trimmed)) {
        return NextResponse.json(
          { error: "File SQL mengandung pernyataan berbahaya dan diblokir." },
          { status: 400 }
        )
      }
    }
  }

  const tablesDetected = (sql.match(/CREATE TABLE/gi) ?? []).length

  let conn: Connection | null = null
  let executed = 0
  try {
    conn = await createConnection(buildConnectionConfig(dbUrl))
    await conn.query("SET FOREIGN_KEY_CHECKS = 0")

    for (const stmt of statements) {
      await conn.query(stmt)
      executed++
    }

    await conn.query("SET FOREIGN_KEY_CHECKS = 1")

    return NextResponse.json({
      success: true,
      file: file.name,
      statements: executed,
      tables: tablesDetected,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    if (conn) {
      try {
        await conn.query("SET FOREIGN_KEY_CHECKS = 1")
      } catch {
        // abaikan
      }
    }
    return NextResponse.json({ error: `Import gagal: ${message}` }, { status: 500 })
  } finally {
    if (conn) {
      await conn.end().catch(() => {})
    }
  }
}