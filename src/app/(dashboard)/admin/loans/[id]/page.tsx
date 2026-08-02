import { notFound, redirect } from "next/navigation"
import { getLoanBook } from "@/lib/actions/loans"
import { canAccess } from "@/lib/roles"
import { LoanBookClient } from "./client"

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

  return <LoanBookClient book={book} />
}
