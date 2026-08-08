"use client"

import { useCallback, useState } from "react"

import {
  getAdminDashboard,
  getFinanceDashboard,
  getGraderDashboard,
  getOperatorDashboard,
  getOwnerDashboard,
} from "@/lib/actions/dashboard"
import type {
  AdminDashboard,
  FinanceDashboard,
  GraderDashboard,
  OperatorDashboard,
  OwnerDashboard,
} from "@/lib/actions/dashboard"
import { useRealtime } from "@/hooks/useRealtime"
import { DashboardHeader } from "./dashboard-header"
import { GraderView } from "./grader-view"
import { OperatorView } from "./operator-view"
import { FinanceView } from "./finance-view"
import { AdminView } from "./admin-view"
import { OwnerView } from "./owner-view"

export type DashboardView =
  | { role: "GRADER"; data: GraderDashboard }
  | { role: "OPERATOR"; data: OperatorDashboard }
  | { role: "FINANCE"; data: FinanceDashboard }
  | { role: "OWNER"; data: OwnerDashboard }
  | { role: "ADMIN"; data: AdminDashboard }
  | { role: "SUPER_ADMIN"; data: OwnerDashboard }

type LoaderMap = {
  GRADER: () => Promise<GraderDashboard>
  OPERATOR: () => Promise<OperatorDashboard>
  FINANCE: () => Promise<FinanceDashboard>
  ADMIN: () => Promise<AdminDashboard>
  OWNER: () => Promise<OwnerDashboard>
  SUPER_ADMIN: () => Promise<OwnerDashboard>
}

const LOADERS: LoaderMap = {
  GRADER: getGraderDashboard,
  OPERATOR: getOperatorDashboard,
  FINANCE: getFinanceDashboard,
  ADMIN: getAdminDashboard,
  OWNER: getOwnerDashboard,
  SUPER_ADMIN: getOwnerDashboard,
}

export function DashboardClient({
  view: initialView,
  userName,
}: {
  view: DashboardView
  userName: string
}) {
  const [view, setView] = useState<DashboardView>(initialView)

  const reload = useCallback(async () => {
    const loader = LOADERS[view.role as keyof LoaderMap]
    if (!loader) return
    const data = await loader()
    setView({ role: view.role, data } as DashboardView)
  }, [view.role])

  useRealtime(null, [reload])

  return (
    <div className="space-y-5">
      <DashboardHeader userName={userName} role={view.role} />
      {view.role === "GRADER" && <GraderView data={view.data} />}
      {view.role === "OPERATOR" && <OperatorView data={view.data} />}
      {view.role === "FINANCE" && <FinanceView data={view.data} />}
      {view.role === "OWNER" && <OwnerView data={view.data} />}
      {view.role === "ADMIN" && <AdminView data={view.data} />}
      {view.role === "SUPER_ADMIN" && <OwnerView data={view.data} />}
    </div>
  )
}
