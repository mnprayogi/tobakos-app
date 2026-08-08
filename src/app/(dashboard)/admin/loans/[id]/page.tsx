import { notFound, redirect } from "next/navigation"
import { auth } from "@/lib/auth"
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

  const [session, companyName] = await Promise.all([
    auth(),
    getSetting("COMPANY_NAME", "TobakOS"),
  ])

  return <LoanBookClient book={book} companyName={companyName} userName={session?.user.name ?? ""} />
}
