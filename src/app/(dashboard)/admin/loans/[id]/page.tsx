import { notFound, redirect } from "next/navigation"
import { getLoanBook } from "@/lib/actions/loans"
import { canAccess } from "@/lib/roles"
import { LoanBookClient } from "./client"
import { getSetting } from "@/lib/settings"

export default async function LoanBookPage({ params }: { params: Promise<{ id: string }> }) {
  if (!(await canAccess(["ADMIN", "FINANCE", "OWNER"]))) redirect("/")
  const { id } = await params
  const loanId = Number(id)
  if (!Number.isInteger(loanId)) notFound()

  let book
  try {
    book = await getLoanBook(loanId)
  } catch {
    notFound()
  }

  const companyName = await getSetting("COMPANY_NAME", "TobakOS")

  return <LoanBookClient book={book} companyName={companyName} />
}
