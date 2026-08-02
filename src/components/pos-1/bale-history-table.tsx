"use client"

import { toast } from "sonner"
import { deleteBale } from "@/lib/actions/grading"
import { StatusPill } from "@/components/shared/status-pill"
import { Trash2 } from "lucide-react"

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
  farmerName,
  farmerNik,
  onDelete,
}: {
  items: BaleItem[]
  farmerName: string | null
  farmerNik: string | null
  onDelete?: (id: number) => void
}) {
  async function handleDelete(id: number) {
    if (!confirm("Hapus bale ini?")) return
    try {
      await deleteBale(id)
      onDelete?.(id)
      toast.success("Bale dihapus")
    } catch (err) {
      toast.error((err as Error).message)
    }
  }

  return (
    <div className="bg-panel border border-border rounded-xl p-4 pb-[18px] table-card-wf">
      <div className="table-head-row">
        <p className="card-title-wf" style={{ margin: 0 }}>
          Daftar Bale Terdaftar — Transaksi {farmerName ?? "—"} ({farmerNik ?? "—"})
        </p>
      </div>
      {items.length === 0 ? (
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
                      className="p-1 text-red-deduction hover:bg-red-deduction/10 rounded-lg cursor-pointer"
                      title="Hapus"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
