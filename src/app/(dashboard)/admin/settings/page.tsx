import { redirect } from "next/navigation"
import { prisma } from "@/lib/db"
import { canAccess } from "@/lib/roles"
import { SettingsClient } from "./client"

export default async function SettingsPage() {
  if (!(await canAccess(["ADMIN"]))) redirect("/")

  const [settings, warehouses] = await Promise.all([
    prisma.systemSetting.findMany({ orderBy: { key: "asc" } }),
    prisma.warehouse.findMany({ orderBy: { code: "asc" } }),
  ])

  return <SettingsClient settings={settings} warehouses={warehouses} />
}
