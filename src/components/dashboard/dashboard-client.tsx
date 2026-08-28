"use client"

import { useCallback, useRef, useState } from "react"

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
import type { DashboardRange } from "@/lib/dashboard-range"
import { useRealtime } from "@/hooks/useRealtime"
import { DashboardHeader } from "./dashboard-header"
import { DashboardRangeFilter } from "./dashboard-range-filter"
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

function loadRange(view: DashboardView, range: DashboardRange): Promise<DashboardView> {
  switch (view.role) {
    case "GRADER":
      return getGraderDashboard().then((data) => ({ role: "GRADER", data }))
    case "OPERATOR":
      return getOperatorDashboard().then((data) => ({ role: "OPERATOR", data }))
    case "FINANCE":
      return getFinanceDashboard().then((data) => ({ role: "FINANCE", data }))
    case "OWNER":
      return getOwnerDashboard(range).then((data) => ({ role: "OWNER", data }))
    case "SUPER_ADMIN":
      return getOwnerDashboard(range).then((data) => ({ role: "SUPER_ADMIN", data }))
    case "ADMIN":
      return getAdminDashboard(range).then((data) => ({ role: "ADMIN", data }))
  }
}

function supportsRange(role: string): boolean {
  return role === "ADMIN" || role === "OWNER" || role === "SUPER_ADMIN"
}

export function DashboardClient({
  view: initialView,
  userName,
}: {
  view: DashboardView
  userName: string
}) {
  const [view, setView] = useState<DashboardView>(initialView)
  const [range, setRange] = useState<DashboardRange>("all")
  const requestSeq = useRef(0)

  const reload = useCallback(async () => {
    const seq = ++requestSeq.current
    const next = await loadRange(view, range)
    if (seq === requestSeq.current) setView(next)
  }, [view, range])

  const handleRangeChange = useCallback(
    (r: DashboardRange) => {
      const seq = ++requestSeq.current
      setRange(r)
      loadRange(view, r).then((data) => {
        if (seq === requestSeq.current) setView(data)
      })
    },
    [view]
  )

  useRealtime(null, [reload])

  return (
    <div className="space-y-5">
      <DashboardHeader userName={userName} role={view.role} />
      {supportsRange(view.role) && (
        <div className="flex justify-end">
          <DashboardRangeFilter value={range} onChange={handleRangeChange} />
        </div>
      )}
      {view.role === "GRADER" && <GraderView data={view.data} />}
      {view.role === "OPERATOR" && <OperatorView data={view.data} />}
      {view.role === "FINANCE" && <FinanceView data={view.data} />}
      {view.role === "OWNER" && <OwnerView data={view.data} range={range} />}
      {view.role === "ADMIN" && <AdminView data={view.data} range={range} />}
      {view.role === "SUPER_ADMIN" && <OwnerView data={view.data} range={range} />}
    </div>
  )
}