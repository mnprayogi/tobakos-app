import { prisma } from "@/lib/db"

interface ColumnInfo {
  tableName: string
  columnName: string
  columnType: string
  isNullable: string
}

interface Col {
  name: string
  columnType: string
}

type Row = Record<string, unknown>

function sqlIdent(name: string): string {
  return `\`${name.replace(/`/g, "``")}\``
}

function esc(v: string): string {
  return v.replace(/'/g, "''")
}

const NUMERIC_TYPE = /^(int|bigint|tinyint|smallint|mediumint|decimal|numeric|float|double|real|bit|year)/i

function formatDate(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0")
  const base = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
  return d.getMilliseconds() > 0 ? `${base}.${String(d.getMilliseconds()).padStart(3, "0")}` : base
}

function sqlValue(v: unknown, col: Col): string {
  if (v === null || v === undefined) return "NULL"
  const t = typeof v
  if (t === "number") return Number.isFinite(v) ? String(v) : "NULL"
  if (t === "bigint") return v.toString()
  if (t === "boolean") return v ? "1" : "0"
  if (v instanceof Date) return `'${formatDate(v)}'`
  if (Buffer.isBuffer(v)) return `X'${v.toString("hex")}'`
  if (t === "string") {
    const str = v as string
    if (NUMERIC_TYPE.test(col.columnType) && /^-?\d+(\.\d+)?$/.test(str)) return str
    return `'${esc(str)}'`
  }
  try {
    const s = String(v)
    if (NUMERIC_TYPE.test(col.columnType) && /^-?\d+(\.\d+)?$/.test(s)) return s
    return `'${esc(s)}'`
  } catch {
    return "NULL"
  }
}

/**
 * Menghasilkan dump SQL lengkap (struktur + data) melalui Prisma.
 * DDL diambil dari SHOW CREATE TABLE server (konsisten di MySQL & MariaDB),
 * data dibaca per tabel. Dipakai sebagai fallback saat mysqldump tidak
 * tersedia (misalnya di environment serverless seperti Vercel).
 */
export async function generateSqlDump(dbName: string): Promise<string> {
  const raw = await prisma.$queryRawUnsafe<ColumnInfo[]>(
    `SELECT TABLE_NAME AS tableName, COLUMN_NAME AS columnName,
            COLUMN_TYPE AS columnType, IS_NULLABLE AS isNullable
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = ?
     ORDER BY TABLE_NAME, ORDINAL_POSITION`,
    dbName
  )

  const tableNames = Array.from(new Set(raw.map((r) => r.tableName)))
  const tableCols = new Map<string, Col[]>()
  for (const r of raw) {
    const col: Col = { name: r.columnName, columnType: r.columnType }
    const list = tableCols.get(r.tableName) ?? []
    list.push(col)
    tableCols.set(r.tableName, list)
  }

  const lines: string[] = []
  lines.push("-- TobakOS database backup (Prisma dump)")
  lines.push(`-- Generated: ${new Date().toISOString()}`)
  lines.push("")
  lines.push("SET NAMES utf8mb4;")
  lines.push("SET SESSION sql_mode = 'NO_BACKSLASH_ESCAPES';")
  lines.push("SET FOREIGN_KEY_CHECKS = 0;")
  lines.push("")

  for (const table of tableNames) {
    const cols = tableCols.get(table) ?? []
    const show = await prisma.$queryRawUnsafe<Array<Record<string, string>>>(
      `SHOW CREATE TABLE ${sqlIdent(table)}`
    )
    const row = show[0] ?? {}
    const ddl = Object.values(row).find((v) => /^CREATE TABLE/i.test((v ?? "").trim()))
    if (!ddl) {
      lines.push(`-- SKIPPED ${table}: gagal membaca definisi tabel.`)
      lines.push("")
      continue
    }

    lines.push(`-- Table structure for ${table}`)
    lines.push(`DROP TABLE IF EXISTS ${sqlIdent(table)};`)
    lines.push(ddl.trim().replace(/;$/, "") + ";")
    lines.push("")

    const rows = await prisma.$queryRawUnsafe<Row[]>(
      `SELECT ${cols.map((c) => sqlIdent(c.name)).join(", ")} FROM ${sqlIdent(table)}`
    )
    if (rows.length === 0) {
      lines.push("")
      continue
    }
    lines.push(`-- Data for ${table} (${rows.length} rows)`)
    const colKeys = cols.map((c) => c.name)
    const insertPrefix = `INSERT INTO ${sqlIdent(table)} (${colKeys.map(sqlIdent).join(", ")}) VALUES`
    for (let i = 0; i < rows.length; i += 500) {
      const chunk = rows.slice(i, i + 500)
      const tuples = chunk.map(
        (rowData) =>
          `(${colKeys.map((k) => sqlValue(rowData[k], cols.find((c) => c.name === k)!)).join(", ")})`
      )
      lines.push(`${insertPrefix}\n${tuples.join(",\n")};`)
    }
    lines.push("")
  }

  lines.push("SET FOREIGN_KEY_CHECKS = 1;")
  lines.push("")
  return lines.join("\n")
}