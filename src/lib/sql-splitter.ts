/**
 * Memecah teks SQL dump menjadi pernyataan (statement) individual.
 * Menangani: string '...' (escaping '' dan \'), identifier `...`,
 * komentar baris (-- dan #), komentar blok (slash-asterisk), komentar
 * versi MySQL (slash-asterisk + !) yang dieksekusi (dianggap SQL asli),
 * dan pernyataan SET SESSION sql_mode untuk deteksi NO_BACKSLASH_ESCAPES.
 */

type Mode = "normal" | "str" | "backtick" | "linecomment"

export function splitSqlStatements(sql: string): string[] {
  const statements: string[] = []
  let buf = ""
  let mode: Mode = "normal"
  let noBackslashEscapes = false
  let i = 0
  const n = sql.length

  const flush = () => {
    const stmt = buf.trim()
    if (stmt.length > 0) {
      statements.push(stmt)
      if (/^SET\s/i.test(stmt) && /sql_mode/i.test(stmt) && /NO_BACKSLASH_ESCAPES/i.test(stmt)) {
        noBackslashEscapes = true
      }
    }
    buf = ""
  }

  while (i < n) {
    const c = sql[i]
    const next = sql[i + 1]

    if (mode === "linecomment") {
      if (c === "\n") mode = "normal"
      i++
      continue
    }

    if (mode === "backtick") {
      if (c === "`") {
        if (next === "`") {
          buf += "``"
          i += 2
          continue
        }
        buf += c
        mode = "normal"
      } else {
        buf += c
      }
      i++
      continue
    }

    if (mode === "str") {
      if (c === "\\" && !noBackslashEscapes && next !== undefined) {
        buf += c + next
        i += 2
        continue
      }
      if (c === "'") {
        if (next === "'") {
          buf += "''"
          i += 2
          continue
        }
        buf += c
        mode = "normal"
      } else {
        buf += c
      }
      i++
      continue
    }

    switch (c) {
      case "'":
        buf += c
        mode = "str"
        i++
        break
      case "`":
        buf += c
        mode = "backtick"
        i++
        break
      case "-":
        if (next === "-" && (sql[i + 2] === " " || sql[i + 2] === "\t" || sql[i + 2] === "\n" || i + 2 >= n)) {
          mode = "linecomment"
          i += 2
          break
        }
        buf += c
        i++
        break
      case "#":
        mode = "linecomment"
        i++
        break
      case "/":
        if (next === "*") {
          if (sql[i + 2] === "!") {
            const end = sql.indexOf("*/", i + 2)
            if (end === -1) {
              buf += sql.slice(i)
              i = n
            } else {
              buf += sql.slice(i, end + 2)
              i = end + 2
            }
          } else {
            const end = sql.indexOf("*/", i + 2)
            if (end === -1) i = n
            else i = end + 2
          }
          break
        }
        buf += c
        i++
        break
      case ";":
        flush()
        i++
        break
      default:
        buf += c
        i++
        break
    }
  }

  flush()
  return statements
}