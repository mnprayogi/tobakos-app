"use client"

import { useState } from "react"
import { toast } from "sonner"
import { deleteBale } from "@/lib/actions/grading"
import { StatusPill } from "@/components/shared/status-pill"
import { Loader2, Trash2 } from "lucide-react"

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
  pendingItems,
  farmerName,
  farmerNik,
  onDelete,
}: {
  items: BaleItem[]
  pendingItems?: BaleItem[]
  farmerName: string | null
  farmerNik: string | null
  onDelete?: (id: number) => void
}) {
  const [deletingId, setDeletingId] = useState<number | null>(null)

  async function handleDelete(id: number) {
    if (deletingId !== null) return
    if (!confirm("Hapus bale ini?")) return
    setDeletingId(id)
    try {
      await deleteBale(id)
      onDelete?.(id)
      toast.success("Bale dihapus")
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="bg-panel border border-border rounded-xl p-4 pb-[18px] table-card-wf">
      <div className="table-head-row">
        <p className="card-title-wf" style={{ margin: 0 }}>
          Daftar Bale Terdaftar — Transaksi {farmerName ?? "—"} ({farmerNik ?? "—"})
        </p>
      </div>
      {items.length === 0 && (!pendingItems || pendingItems.length === 0) ? (
        <p className="text-[12.5px] text-muted-foreground py-3 text-center">Belum ada bale terdaftar.</p>
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
              {items.map((item, i) => (
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
                    <button
                      type="button"
                      onClick={() => handleDelete(item.id)}
                      disabled={deletingId === item.id}
                      className="p-1 text-red-deduction hover:bg-red-deduction/10 rounded-lg cursor-pointer disabled:opacity-50"
                      title="Hapus"
                    >
                      {deletingId === item.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </td>
                </tr>
              ))}
              {pendingItems?.map((item, i) => (
                <tr key={item.id} className="bg-amber/[0.06]">
                  <td className="wf-table-td">{items.length + i + 1}</td>
                  <td className="wf-table-td whitespace-nowrap text-muted-2 italic">{item.labelCode}</td>
                  <td className="wf-table-td whitespace-nowrap">{item.farmerName}</td>
                  <td className="wf-table-td">{item.grade}</td>
                  <td className="wf-table-td whitespace-nowrap">{item.tobaccoType}</td>
                  <td className="wf-table-td whitespace-nowrap">{item.customerName ?? "—"}</td>
                  <td className="wf-table-td whitespace-nowrap text-muted-2">—</td>
                  <td className="wf-table-td">
                    <StatusPill status="PENDING" />
                  </td>
                  <td className="wf-table-td text-muted-2">—</td>
                </tr>
              ))}
            </tbody>
          </table>
          {pendingItems && pendingItems.length > 0 && (
            <p className="text-[10.5px] text-amber mt-2">
              {pendingItems.length} bale menunggu sinkron — barcode resmi muncul setelah koneksi pulih.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
