import { format } from "date-fns"
import { prisma } from "@/lib/db"
import type { Prisma } from "@/generated/prisma/client"

export async function nextSequence(scope: string, tx?: Prisma.TransactionClient): Promise<number> {
  const seqDate = format(new Date(), "yyyyMMdd")
  const run = async (client: Prisma.TransactionClient) => {
    await client.$executeRaw`
      INSERT INTO label_sequences (scope, seqDate, value)
      VALUES (${scope}, ${seqDate}, 1)
      ON DUPLICATE KEY UPDATE value = LAST_INSERT_ID(value + 1)
    `
    const rows = await client.$queryRaw<{ value: number }[]>`
      SELECT value FROM label_sequences WHERE scope = ${scope} AND seqDate = ${seqDate}
    `
    return rows[0].value
  }
  if (tx) return run(tx)
  return prisma.$transaction((inner) => run(inner))
}
