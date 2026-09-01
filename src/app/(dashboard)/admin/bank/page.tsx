import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { canAccess } from "@/lib/roles"
import { getBankData } from "@/lib/actions/bank"
import { getSetting } from "@/lib/settings"
import { BankClient } from "./client"

export default async function BankPage() {
  if (!(await canAccess(["ADMIN", "FINANCE", "OWNER"]))) redirect("/")

  const [bank, session, companyName] = await Promise.all([
    getBankData(),
    auth(),
    getSetting("COMPANY_NAME", "TobakOS"),
  ])

  return (
    <BankClient
      bank={bank}
      companyName={companyName}
      userName={session?.user.name ?? ""}
    />
  )
}
