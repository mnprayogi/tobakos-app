import { redirect } from "next/navigation"
import { canAccess } from "@/lib/roles"
import { ImportRiwayatClient } from "./client"

export default async function ImportRiwayatPage() {
  if (!(await canAccess(["ADMIN"]))) redirect("/")

  return <ImportRiwayatClient />
}