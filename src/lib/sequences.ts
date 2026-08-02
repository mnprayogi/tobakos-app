import { format } from "date-fns"
import { prisma } from "@/lib/db"

export async function nextSequence(scope: string): Promise<number> {
  const seqDate = format(new Date(), "yyyyMMdd")
  const seq = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`
      INSERT INTO label_sequences (scope, seqDate, value)
      VALUES (${scope}, ${seqDate}, 1)
      ON DUPLICATE KEY UPDATE value = LAST_INSERT_ID(value + 1)
    `
    const rows = await tx.$queryRaw<{ value: number }[]>`
      SELECT value FROM label_sequences WHERE scope = ${scope} AND seqDate = ${seqDate}
    `
    return rows[0].value
  })
  return seq
}
