import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { z } from "zod"

const resetSchema = z.object({
  confirm: z.literal("RESET"),
})

function isAdmin(role: unknown): boolean {
  return role === "ADMIN" || role === "SUPER_ADMIN"
}

export async function POST(request: Request) {
  const session = await auth()
  if (!isAdmin(session?.user?.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Request tidak valid" }, { status: 400 })
  }

  const parsed = resetSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Ketik "RESET" untuk konfirmasi penghapusan data.' },
      { status: 400 }
    )
  }

  try {
    const result = await prisma.$transaction([
      prisma.appEvent.deleteMany(),
      prisma.loanEntry.deleteMany(),
      prisma.cashEntry.deleteMany(),
      prisma.bankEntry.deleteMany(),
      prisma.purchaseItem.deleteMany(),
      prisma.payment.deleteMany(),
      prisma.purchase.deleteMany(),
      prisma.farmerLoan.deleteMany(),
      prisma.labelSequence.deleteMany(),
    ])

    return NextResponse.json({
      success: true,
      deleted: {
        appEvents: result[0].count,
        loanEntries: result[1].count,
        cashEntries: result[2].count,
        bankEntries: result[3].count,
        purchaseItems: result[4].count,
        payments: result[5].count,
        purchases: result[6].count,
        farmerLoans: result[7].count,
        labelSequences: result[8].count,
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: `Reset gagal: ${message}` }, { status: 500 })
  }
}