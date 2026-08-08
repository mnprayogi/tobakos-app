"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/db"
import { isMultipleOf100, negotiateItems, roundMoney, roundRupiah } from "@/lib/calculations"
import { requireRoles } from "@/lib/roles"
import { publishEvent } from "@/lib/events"
import { resolveWarehouseScope } from "@/lib/actions/scope"
import { loanTotals } from "@/lib/loan-totals"

export type PaymentMethodValue = "TUNAI" | "TRANSFER"

export interface ReviewInput {
  newTotalPrice?: number | null
  note?: string | null
}

export async function reviewAndApprove(purchaseId: number, input: ReviewInput) {
  const actor = await requireRoles("ADMIN", "FINANCE")

  const purchase = await prisma.purchase.findUnique({
    where: { id: purchaseId },
    include: {
      items: {
        where: { status: { in: ["GRADED", "WEIGHED", "CLOSED"] } },
        orderBy: { inputOrder: "asc" },
      },
    },
  })
  if (!purchase) throw new Error("Transaksi tidak ditemukan")
  if (purchase.status !== "WEIGHED") throw new Error("Transaksi harus berstatus WEIGHED untuk direview")
  if (purchase.items.length === 0) throw new Error("Transaksi tidak memiliki bale")

  const currentTotal = Number(purchase.totalPrice)
  const note = input.note?.trim() || null
  const hasNegotiation =
    input.newTotalPrice != null &&
    Math.abs(roundRupiah(input.newTotalPrice) - currentTotal) > 0.005

  const result = await prisma.$transaction(async (tx) => {
    if (hasNegotiation) {
      const newTotal = roundMoney(input.newTotalPrice!)
      const negotiated = negotiateItems(
        purchase.items.map((i) => ({
          netWeight: Number(i.netWeight ?? 0),
          pricePerKg: Number(i.pricePerKg ?? 0),
        })),
        currentTotal,
        newTotal
      )

      for (let i = 0; i < purchase.items.length; i++) {
        const item = purchase.items[i]
        await tx.purchaseItem.update({
          where: { id: item.id },
          data: {
            priceAdjustment: negotiated.adjustmentsPerKg[i],
            subtotal: negotiated.subtotals[i],
          },
        })
      }

      return tx.purchase.update({
        where: { id: purchaseId },
        data: {
          status: "APPROVED",
          approvedBy: actor,
          originalTotalPrice: currentTotal,
          priceReviewNote: note,
          totalPrice: negotiated.exactTotal,
        },
      })
    }

    return tx.purchase.update({
      where: { id: purchaseId },
      data: {
        status: "APPROVED",
        approvedBy: actor,
        priceReviewNote: note,
      },
    })
  })

  revalidatePath("/admin/transactions")
  revalidatePath("/admin/debt")
  publishEvent("purchase.approved", purchase.laneId)
  return { ...result, totalPrice: Number(result.totalPrice) }
}

export interface PaymentInput {
  amount: number
  method: PaymentMethodValue
  note?: string | null
  loanDeduction?: number
}

export async function recordPayment(purchaseId: number, input: PaymentInput) {
  const actor = await requireRoles("ADMIN", "FINANCE")

  const amount = roundMoney(input.amount)
  if (amount < 0) throw new Error("Jumlah pembayaran tidak boleh negatif")

  const loanDeduction = input.loanDeduction ? roundMoney(input.loanDeduction) : 0
  if (loanDeduction < 0) throw new Error("Potongan hutang tidak boleh negatif")

  let purchaseLaneId: number | null = null

  const result = await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM tobacco_purchases WHERE id = ${purchaseId} FOR UPDATE`

    const purchase = await tx.purchase.findUnique({
      where: { id: purchaseId },
      include: {
        items: { where: { status: "WEIGHED" } },
      },
    })
    if (!purchase) throw new Error("Transaksi tidak ditemukan")
    if (purchase.status !== "APPROVED") throw new Error("Transaksi harus disetujui terlebih dahulu")
    purchaseLaneId = purchase.laneId

    const totalPrice = Number(purchase.totalPrice)
    const paidAmount = Number(purchase.paidAmount)
    const remaining = roundMoney(totalPrice - paidAmount)
    const credit = roundMoney(amount + loanDeduction)
    if (credit <= 0.005) {
      throw new Error("Kredit transaksi harus lebih dari 0")
    }
    if (loanDeduction > remaining + 0.005) {
      throw new Error(`Potongan hutang melebihi sisa tagihan (sisa Rp ${remaining.toLocaleString("id-ID")})`)
    }
    if (credit > remaining + 0.005) {
      throw new Error(`Kredit transaksi melebihi sisa tagihan (sisa Rp ${remaining.toLocaleString("id-ID")})`)
    }
    const isExactRemaining = Math.abs(credit - remaining) <= 0.005
    if (!isExactRemaining && !isMultipleOf100(credit)) {
      throw new Error("Kredit transaksi harus kelipatan 100 Rupiah")
    }

    let loan = null
    let newLoanBalance: number | null = null
    if (loanDeduction > 0.005) {
      await tx.$queryRaw`SELECT id FROM farmer_loans WHERE farmerId = ${purchase.farmerId} FOR UPDATE`

      loan = await tx.farmerLoan.findUnique({
        where: { farmerId: purchase.farmerId },
        include: { entries: { select: { type: true, amount: true, voidedAt: true } } },
      })
      if (!loan || loan.status !== "ACTIVE") {
        throw new Error("Petani tidak memiliki hutang modal aktif")
      }
      if (purchase.warehouseId != null && loan.warehouseId !== purchase.warehouseId) {
        throw new Error("Buku hutang petani terdaftar di gudang berbeda dari transaksi")
      }
      const loanBalance = loanTotals(loan.entries).balance
      if (loanDeduction > loanBalance + 0.005) {
        throw new Error(`Potongan hutang melebihi sisa hutang (sisa Rp ${loanBalance.toLocaleString("id-ID")})`)
      }
      const isLoanSettled = Math.abs(loanDeduction - loanBalance) <= 0.005
      if (!isLoanSettled && !isMultipleOf100(loanDeduction)) {
        throw new Error("Potongan hutang harus kelipatan 100 Rupiah")
      }
      newLoanBalance = roundMoney(loanBalance - loanDeduction)
    }

    const payment = await tx.payment.create({
      data: {
        purchaseId,
        amount,
        method: input.method,
        note: input.note?.trim() || null,
        paidBy: actor,
        loanDeduction,
      },
    })

    let loanEntryId: number | null = null
    if (loanDeduction > 0.005) {
      const isLoanSettled = newLoanBalance != null && Math.abs(newLoanBalance) <= 0.005

      const entry = await tx.loanEntry.create({
        data: {
          loanId: loan!.id,
          type: "REPAYMENT",
          method: "POTONG_TRANSAKSI",
          amount: loanDeduction,
          purchaseId,
          paymentId: payment.id,
          note: input.note?.trim() || null,
          createdBy: actor,
        },
      })
      loanEntryId = entry.id

      await tx.farmerLoan.update({
        where: { id: loan!.id },
        data: {
          ...(isLoanSettled ? { status: "SETTLED", settledAt: new Date() } : {}),
          updatedAt: new Date(),
        },
      })
    }

    const newPaidAmount = roundMoney(paidAmount + credit)
    const isPaidOff = newPaidAmount >= totalPrice - 0.005

    await tx.purchase.update({
      where: { id: purchaseId },
      data: {
        paidAmount: isPaidOff ? totalPrice : newPaidAmount,
        ...(isPaidOff
          ? { status: "PAID", paidBy: actor }
          : {}),
      },
    })

    if (isPaidOff) {
      await tx.purchaseItem.updateMany({
        where: { purchaseId, status: "WEIGHED" },
        data: { status: "CLOSED", closedBy: actor },
      })
    }

    const storedPaid = isPaidOff ? totalPrice : newPaidAmount
    return {
      payment: {
        id: payment.id,
        amount: Number(payment.amount),
        method: payment.method,
        note: payment.note,
        paidBy: payment.paidBy,
        paidAt: payment.paidAt,
        loanDeduction: Number(payment.loanDeduction ?? 0),
      },
      paidOff: isPaidOff,
      newPaidAmount: storedPaid,
      remaining: roundMoney(totalPrice - storedPaid),
      loanDeduction: loanDeduction > 0.005 ? loanDeduction : 0,
      loanBalance: newLoanBalance,
      loanEntryId,
    }
  })

  revalidatePath("/admin/transactions")
  revalidatePath("/admin/debt")
  revalidatePath("/admin/loans")
  publishEvent("payment.recorded", purchaseLaneId)
  return result
}

export async function voidPayment(purchaseId: number, paymentId: number) {
  const actor = await requireRoles("SUPER_ADMIN", "OWNER")

  let purchaseLaneId: number | null = null
  let loanTouched = false

  const result = await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM tobacco_purchases WHERE id = ${purchaseId} FOR UPDATE`

    const purchase = await tx.purchase.findUnique({
      where: { id: purchaseId },
      include: {
        items: { where: { status: "CLOSED" } },
        payments: { orderBy: { paidAt: "asc" } },
      },
    })
    if (!purchase) throw new Error("Transaksi tidak ditemukan")
    if (purchase.status !== "APPROVED" && purchase.status !== "PAID")
      throw new Error("Hanya transaksi APPROVED/PAID yang bisa dikoreksi pembayarannya")
    purchaseLaneId = purchase.laneId

    const payment = purchase.payments.find((p) => p.id === paymentId)
    if (!payment) throw new Error("Pembayaran tidak ditemukan pada transaksi ini")
    if (payment.voidedAt) throw new Error("Pembayaran ini sudah dibatalkan")

    if (Number(payment.loanDeduction ?? 0) > 0.005) {
      await tx.$queryRaw`SELECT id FROM farmer_loans WHERE farmerId = ${purchase.farmerId} FOR UPDATE`
      loanTouched = true
      await tx.loanEntry.updateMany({
        where: { paymentId },
        data: { voidedAt: new Date(), voidedBy: actor },
      })
    }

    await tx.payment.update({
      where: { id: paymentId },
      data: { voidedAt: new Date(), voidedBy: actor },
    })

    const validPayments = purchase.payments.filter(
      (p) => p.id !== paymentId && !p.voidedAt
    )
    let paidAmount = 0
    for (const p of validPayments) {
      paidAmount += Number(p.amount) + Number(p.loanDeduction ?? 0)
    }
    paidAmount = roundMoney(paidAmount)

    const totalPrice = Number(purchase.totalPrice)
    const isPaidOff = paidAmount >= totalPrice - 0.005
    const finalPaid = isPaidOff ? totalPrice : paidAmount
    const lastPayment = validPayments[validPayments.length - 1]

    await tx.purchase.update({
      where: { id: purchaseId },
      data: {
        paidAmount: finalPaid,
        status: isPaidOff ? "PAID" : "APPROVED",
        paidBy: isPaidOff ? (lastPayment?.paidBy ?? null) : null,
      },
    })

    if (!isPaidOff) {
      await tx.purchaseItem.updateMany({
        where: { purchaseId, status: "CLOSED" },
        data: { status: "WEIGHED", closedBy: null },
      })
    }

    if (loanTouched) {
      const loan = await tx.farmerLoan.findUnique({
        where: { farmerId: purchase.farmerId },
        include: { entries: { select: { type: true, amount: true, voidedAt: true } } },
      })
      if (loan) {
        const balance = loanTotals(loan.entries).balance
        const isSettled = balance <= 0.005
        await tx.farmerLoan.update({
          where: { id: loan.id },
          data: {
            status: isSettled ? "SETTLED" : "ACTIVE",
            ...(isSettled ? { settledAt: new Date() } : { settledAt: null }),
            updatedAt: new Date(),
          },
        })
      }
    }

    return {
      paymentId: payment.id,
      paidOff: isPaidOff,
      paidAmount: finalPaid,
      remaining: roundMoney(totalPrice - finalPaid),
      loanTouched,
    }
  })

  revalidatePath("/admin/transactions")
  revalidatePath("/admin/debt")
  if (result.loanTouched) revalidatePath("/admin/loans")
  publishEvent("payment.voided", purchaseLaneId)
  if (result.loanTouched) publishEvent("loan.updated")
  return result
}

export async function reopenTransaction(purchaseId: number) {
  await requireRoles("ADMIN", "FINANCE")

  const purchase = await prisma.purchase.findUnique({
    where: { id: purchaseId },
    include: { payments: { where: { voidedAt: null }, select: { id: true } } },
  })
  if (!purchase) throw new Error("Transaksi tidak ditemukan")
  if (purchase.status !== "APPROVED" && purchase.status !== "PAID")
    throw new Error("Hanya transaksi APPROVED/PAID yang bisa dibuka kembali")
  if (Number(purchase.paidAmount) > 0)
    throw new Error("Transaksi sudah pernah dibayar — tidak bisa dibuka kembali")
  if (purchase.payments.length > 0)
    throw new Error("Transaksi sudah memiliki pembayaran — tidak bisa dibuka kembali")

  await prisma.$transaction([
    prisma.purchase.update({
      where: { id: purchaseId },
      data: { status: "WEIGHED", approvedBy: null, paidBy: null },
    }),
    prisma.purchaseItem.updateMany({
      where: { purchaseId, status: "CLOSED" },
      data: { status: "WEIGHED", closedBy: null },
    }),
  ])

  revalidatePath("/admin/transactions")
  revalidatePath("/admin/debt")
  publishEvent("purchase.reopened", purchase.laneId)
  return purchase
}

export type DebtStatus = "HUTANG" | "DP" | "LUNAS"

export interface DebtPayment {
  id: number
  amount: number
  method: string
  note: string | null
  paidBy: string | null
  paidAt: Date
  loanDeduction: number
}

export interface DebtPurchase {
  id: number
  transactionCode: string
  transactionDate: Date
  totalPrice: number
  paidAmount: number
  remaining: number
  status: string
  derived: DebtStatus
  itemCount: number
  payments: DebtPayment[]
}

export interface DebtFarmer {
  farmerId: number
  farmerName: string
  farmerNik: string | null
  totalTagihan: number
  totalDibayar: number
  sisa: number
  status: DebtStatus
  loanBalance: number
  purchases: DebtPurchase[]
}

export async function getDebtSummary(): Promise<DebtFarmer[]> {
  await requireRoles("ADMIN", "FINANCE", "OWNER")
  const scope = await resolveWarehouseScope()
  const purchases = await prisma.purchase.findMany({
    where: {
      status: { in: ["APPROVED", "PAID"] },
      ...(scope.mode === "scoped" ? { warehouseId: scope.warehouseId } : {}),
    },
    orderBy: [{ farmerId: "asc" }, { createdAt: "desc" }],
    include: {
      farmer: { select: { name: true, nik: true } },
      payments: {
        select: {
          id: true,
          amount: true,
          method: true,
          note: true,
          paidBy: true,
          paidAt: true,
          loanDeduction: true,
        },
        where: { voidedAt: null },
        orderBy: { paidAt: "asc" },
      },
      _count: { select: { items: true } },
    },
  })

  const farmerIds = [...new Set(purchases.map((p) => p.farmerId))]
  const loans = await prisma.farmerLoan.findMany({
    where: {
      farmerId: { in: farmerIds },
      status: "ACTIVE",
      ...(scope.mode === "scoped" ? { warehouseId: scope.warehouseId } : {}),
    },
    include: { entries: { select: { type: true, amount: true, voidedAt: true } } },
  })
  const loanBalanceByFarmer = new Map<number, number>()
  for (const loan of loans) {
    loanBalanceByFarmer.set(loan.farmerId, loanTotals(loan.entries).balance)
  }

  const farmers = new Map<number, DebtFarmer>()

  for (const p of purchases) {
    const totalPrice = Number(p.totalPrice)
    const paidAmount = Number(p.paidAmount)
    const remaining = roundMoney(totalPrice - paidAmount)
    const derived: DebtStatus = remaining <= 0.005 ? "LUNAS" : paidAmount <= 0.005 ? "HUTANG" : "DP"

    const farmer = farmers.get(p.farmerId) ?? {
      farmerId: p.farmerId,
      farmerName: p.farmer.name,
      farmerNik: p.farmer.nik,
      totalTagihan: 0,
      totalDibayar: 0,
      sisa: 0,
      status: "LUNAS" as DebtStatus,
      loanBalance: loanBalanceByFarmer.get(p.farmerId) ?? 0,
      purchases: [],
    }

    farmer.totalTagihan += totalPrice
    farmer.totalDibayar += paidAmount
    farmer.sisa += remaining
    farmer.purchases.push({
      id: p.id,
      transactionCode: p.transactionCode,
      transactionDate: p.transactionDate,
      totalPrice,
      paidAmount,
      remaining,
      status: p.status,
      derived,
      itemCount: p._count.items,
      payments: p.payments.map((pay) => ({
        id: pay.id,
        amount: Number(pay.amount),
        method: pay.method,
        note: pay.note,
        paidBy: pay.paidBy,
        paidAt: pay.paidAt,
        loanDeduction: Number(pay.loanDeduction ?? 0),
      })),
    })

    farmers.set(p.farmerId, farmer)
  }

  return Array.from(farmers.values()).map((f) => {
    const sisa = roundMoney(f.sisa)
    let status: DebtStatus = "LUNAS"
    if (sisa > 0.005) status = f.totalDibayar <= 0.005 ? "HUTANG" : "DP"
    return { ...f, sisa, status }
  })
}

export interface BuktiPayment {
  id: number
  amount: number
  method: string
  note: string | null
  paidBy: string | null
  paidAt: Date
  loanDeduction: number
}

export interface BuktiData {
  purchaseId: number
  transactionCode: string
  transactionDate: Date
  farmerName: string
  farmerNik: string | null
  warehouseLabel: string | null
  laneCode: string | null
  totalItems: number
  totalNetWeight: number
  totalPrice: number
  originalTotalPrice: number | null
  paidAmount: number
  totalLoanDeduction: number
  remaining: number
  paidBy: string | null
  approvedBy: string | null
  lastPaidAt: Date | null
  payments: BuktiPayment[]
}

export async function getBuktiData(purchaseId: number): Promise<BuktiData> {
  await requireRoles("ADMIN", "FINANCE", "OWNER")

  const purchase = await prisma.purchase.findUnique({
    where: { id: purchaseId },
    include: {
      farmer: true,
      warehouse: true,
      lane: true,
      payments: { where: { voidedAt: null }, orderBy: { paidAt: "asc" } },
    },
  })
  if (!purchase) throw new Error("Transaksi tidak ditemukan")
  if (purchase.status !== "PAID") throw new Error("Transaksi belum lunas — tidak bisa mencetak bukti lunas")

  const totalPrice = Number(purchase.totalPrice)
  const paidAmount = Number(purchase.paidAmount)
  const totalLoanDeduction = roundMoney(
    purchase.payments.reduce((s, pay) => s + Number(pay.loanDeduction ?? 0), 0)
  )

  return {
    purchaseId: purchase.id,
    transactionCode: purchase.transactionCode,
    transactionDate: purchase.transactionDate,
    farmerName: purchase.farmer.name,
    farmerNik: purchase.farmer.nik,
    warehouseLabel: purchase.warehouse?.name ?? purchase.warehouse?.code ?? null,
    laneCode: purchase.lane?.code ?? null,
    totalItems: purchase.totalItems,
    totalNetWeight: purchase.totalNetWeight,
    totalPrice,
    originalTotalPrice: purchase.originalTotalPrice != null ? Number(purchase.originalTotalPrice) : null,
    paidAmount,
    totalLoanDeduction,
    remaining: roundMoney(totalPrice - paidAmount),
    paidBy: purchase.paidBy,
    approvedBy: purchase.approvedBy,
    lastPaidAt: purchase.payments.length > 0 ? purchase.payments[purchase.payments.length - 1].paidAt : null,
    payments: purchase.payments.map((pay) => ({
      id: pay.id,
      amount: Number(pay.amount),
      method: pay.method,
      note: pay.note,
      paidBy: pay.paidBy,
      paidAt: pay.paidAt,
      loanDeduction: Number(pay.loanDeduction ?? 0),
    })),
  }
}
