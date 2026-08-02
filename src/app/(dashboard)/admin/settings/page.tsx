import { prisma } from "@/lib/db"
import { SettingsClient } from "./client"

export default async function SettingsPage() {
  const settings = await prisma.systemSetting.findMany({ orderBy: { key: "asc" } })
  return <SettingsClient settings={settings} />
}
