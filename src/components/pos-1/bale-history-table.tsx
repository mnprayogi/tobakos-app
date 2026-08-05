"use client"

import { useState } from "react"
import { toast } from "sonner"
import { deleteBale } from "@/lib/actions/grading"
import { StatusPill } from "@/components/shared/status-pill"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty"
import { Loader2, Trash2, Loader, PackageX, ChevronDown, ChevronUp } from "lucide-react"

const DISPLAY_LIMIT = 10

interface BaleItem {
  id: number
  labelCode: string
  grade: string
  status: string
  tobaccoType: string
  farmerName: string
  customerName: string | null
  createdBy: string | null
}

export function BaleHistoryTable({
  items,
  syncingItems,
  pendingItems,
  farmerName,
  farmerNik,
  onDelete,
}: {
  items: BaleItem[]
  syncingItems?: BaleItem[]
  pendingItems?: BaleItem[]
  farmerName: string | null
  farmerNik: string | null
  onDelete?: (id: number) => void
}) {
  const [deleteTarget, setDeleteTarget] = useState<BaleItem | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [expanded, setExpanded] = useState(false)
  const [lastFarmerKey, setLastFarmerKey] = useState(`${farmerName}|${farmerNik}`)

  const farmerKey = `${farmerName}|${farmerNik}`
  if (farmerKey !== lastFarmerKey) {
    setLastFarmerKey(farmerKey)
    setExpanded(false)
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeletingId(deleteTarget.id)
    try {
      await deleteBale(deleteTarget.id)
      onDelete?.(deleteTarget.id)
      toast.success("Bale dihapus")
      setDeleteTarget(null)
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setDeletingId(null)
    }
  }

  const totalPending = (syncingItems?.length ?? 0) + (pendingItems?.length ?? 0)
  const visibleItems =
    items.length > DISPLAY_LIMIT && !expanded ? items.slice(0, DISPLAY_LIMIT) : items

  return (
    <>
      <div className="bg-panel border border-border rounded-xl p-4 pb-[18px] table-card-wf">
        <div className="table-head-row">
          <p className="card-title-wf" style={{ margin: 0 }}>
            Daftar Bale Terdaftar — Transaksi {farmerName ?? "—"} ({farmerNik ?? "—"})
          </p>
        </div>
        {items.length === 0 && totalPending === 0 ? (
          <Empty className="border-border">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <PackageX />
              </EmptyMedia>
              <EmptyTitle>Belum ada bale terdaftar</EmptyTitle>
              <EmptyDescription>Bale hasil grading akan muncul di tabel ini.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="wf-table">
              <thead>
                <tr>
                  <th className="wf-table-th">No</th>
                  <th className="wf-table-th">Barcode</th>
                  <th className="wf-table-th">Petani</th>
                  <th className="wf-table-th">Grade</th>
                  <th className="wf-table-th">Jenis Tembakau</th>
                  <th className="wf-table-th">Customer</th>
                  <th className="wf-table-th">Oleh</th>
                  <th className="wf-table-th">Status</th>
                  <th className="wf-table-th">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {visibleItems.map((item, i) => (
                  <tr key={item.id}>
                    <td className="wf-table-td">{i + 1}</td>
                    <td className="wf-table-td whitespace-nowrap">{item.labelCode}</td>
                    <td className="wf-table-td whitespace-nowrap">{item.farmerName}</td>
                    <td className="wf-table-td">{item.grade}</td>
                    <td className="wf-table-td whitespace-nowrap">{item.tobaccoType}</td>
                    <td className="wf-table-td whitespace-nowrap">{item.customerName ?? "—"}</td>
                    <td className="wf-table-td whitespace-nowrap">{item.createdBy ?? "—"}</td>
                    <td className="wf-table-td">
                      <StatusPill status={item.status as "GRADED" | "WEIGHED" | "CLOSED"} />
                    </td>
                    <td className="wf-table-td">
                      {item.status === "GRADED" ? (
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon-sm"
                          onClick={() => setDeleteTarget(item)}
                          disabled={deletingId === item.id}
                          title="Hapus"
                          aria-label={`Hapus bale ${item.labelCode}`}
                        >
                          {deletingId === item.id ? (
                            <Loader2 className="animate-spin" />
                          ) : (
                            <Trash2 />
                          )}
                        </Button>
                      ) : (
                        <span className="text-muted-2">—</span>
                      )}
                    </td>
                  </tr>
                ))}
                {syncingItems?.map((item, i) => (
                  <tr key={item.id} className="bg-blue/[0.06]">
                    <td className="wf-table-td">{items.length + i + 1}</td>
                    <td className="wf-table-td whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5 text-blue font-mono text-[11.5px]">
                        <Loader className="size-3 animate-spin" />
                        {item.labelCode}
                      </span>
                    </td>
                    <td className="wf-table-td whitespace-nowrap">{item.farmerName}</td>
                    <td className="wf-table-td">{item.grade}</td>
                    <td className="wf-table-td whitespace-nowrap">{item.tobaccoType}</td>
                    <td className="wf-table-td whitespace-nowrap">{item.customerName ?? "—"}</td>
                    <td className="wf-table-td whitespace-nowrap text-muted-2">—</td>
                    <td className="wf-table-td">
                      <StatusPill status="SYNCING" />
                    </td>
                    <td className="wf-table-td text-muted-2">—</td>
                  </tr>
                ))}
                {pendingItems?.map((item, i) => (
                  <tr key={item.id} className="bg-amber/[0.06]">
                    <td className="wf-table-td">{items.length + (syncingItems?.length ?? 0) + i + 1}</td>
                    <td className="wf-table-td whitespace-nowrap text-muted-2 italic">{item.labelCode}</td>
                    <td className="wf-table-td whitespace-nowrap">{item.farmerName}</td>
                    <td className="wf-table-td">{item.grade}</td>
                    <td className="wf-table-td whitespace-nowrap">{item.tobaccoType}</td>
                    <td className="wf-table-td whitespace-nowrap">{item.customerName ?? "—"}</td>
                    <td className="wf-table-td whitespace-nowrap text-muted-2">—</td>
                    <td className="wf-table-td">
                      <StatusPill status={item.status === "SYNCING" ? "SYNCING" : "PENDING"} />
                    </td>
                    <td className="wf-table-td text-muted-2">—</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {totalPending > 0 && (
              <p className="text-[10.5px] text-amber mt-2">
                {totalPending} bale menunggu sinkron — barcode resmi muncul setelah koneksi pulih.
              </p>
            )}
            {items.length > DISPLAY_LIMIT && (
              <div className="mt-3 border-t border-border-soft pt-2.5">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => setExpanded((v) => !v)}
                >
                  {expanded ? "Tampilkan lebih sedikit" : `Tampilkan semua (${items.length} bale)`}
                  {expanded ? (
                    <ChevronUp data-icon="inline-end" />
                  ) : (
                    <ChevronDown data-icon="inline-end" />
                  )}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
      >
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus bale?</AlertDialogTitle>
            <AlertDialogDescription>
              Bale {deleteTarget?.labelCode} ({deleteTarget?.grade}) akan dihapus permanen dari
              transaksi.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingId !== null}>Batal</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleDelete}
              disabled={deletingId !== null}
            >
              {deletingId !== null ? "Menghapus…" : "Hapus"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
