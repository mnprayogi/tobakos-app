import { notFound, redirect } from "next/navigation"
import { prisma } from "@/lib/db"
import { canAccess } from "@/lib/roles"
import { ReviewClient } from "./client"

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function ReviewPage({ params }: PageProps) {
  if (!(await canAccess(["ADMIN", "FINANCE"]))) redirect("/")

  const { id } = await params
  const purchaseId = Number(id)
  if (!Number.isInteger(purchaseId) || purchaseId <= 0) notFound()

  const purchase = await prisma.purchase.findUnique({
    where: { id: purchaseId },
    include: {
      farmer: true,
      items: {
        orderBy: { inputOrder: "asc" },
        include: { customer: true },
      },
      payments: { orderBy: { paidAt: "asc" } },
    },
  })
  if (!purchase) notFound()
  if (purchase.status !== "WEIGHED") redirect("/admin/transactions")

  return (
    <ReviewClient
      purchase={{
        id: purchase.id,
        transactionCode: purchase.transactionCode,
        farmerName: purchase.farmer.name,
        transactionDate: purchase.transactionDate,
        totalItems: purchase.totalItems,
        totalNetWeight: purchase.totalNetWeight,
        totalPrice: Number(purchase.totalPrice),
        status: purchase.status,
        items: purchase.items.map((i) => ({
          id: i.id,
          labelCode: i.labelCode,
          grade: i.grade,
          customerName: i.customer?.name ?? null,
          netWeight: i.netWeight != null ? Number(i.netWeight) : null,
          pricePerKg: Number(i.pricePerKg ?? 0),
          priceAdjustment: Number(i.priceAdjustment ?? 0),
          subtotal: Number(i.subtotal ?? 0),
        })),
      }}
    />
  )
}
