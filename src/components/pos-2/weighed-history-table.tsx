"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { toast } from "sonner"
import { getWeighedHistory, endWeighSession, getSessionUnweighed } from "@/lib/actions/weighing"
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { formatCurrency } from "@/lib/utils"
import { cn } from "@/lib/utils"
import { StatusPill } from "@/components/shared/status-pill"
import { useRealtime } from "@/hooks/useRealtime"
import { ChevronDown } from "lucide-react"
import type { HistoryPurchase, SessionCheckResult } from "@/lib/actions/weighing"

interface Props {
  laneId: number
  farmerId: number | null
  farmerName: string | null
  refreshKey?: number
  onSessionEnded?: () => void
  onSelectItem?: (labelCode: string) => void
}

export function WeighedHistory({ laneId, farmerId, farmerName, refreshKey = 0, onSessionEnded, onSelectItem }: Props) {
  const [purchases, setPurchases] = useState<HistoryPurchase[]>([])
  const [loadedFor, setLoadedFor] = useState<string | null>(null)
  const loading = farmerId != null && loadedFor !== `${farmerId}:${laneId}`
  const [finishing, setFinishing] = useState<number | null>(null)
  const [confirmPurchase, setConfirmPurchase] = useState<HistoryPurchase | null>(null)
  const [sessionCheck, setSessionCheck] = useState<SessionCheckResult | null>(null)
  const [checking, setChecking] = useState(false)
  const [collapsedIds, setCollapsedIds] = useState<Set<number>>(new Set())
  const activeBodyRef = useRef<HTMLDivElement | null>(null)
  const lastNewestRef = useRef<number | null>(null)
  const stickRef = useRef(true)

  const loadHistory = useCallback(async () => {
    if (!farmerId) return
    const shouldStick = stickRef.current
    try {
      const data = await getWeighedHistory(farmerId, laneId)
      const newestId = data[0]?.id ?? null
      if (newestId != null && lastNewestRef.current !== newestId) {
        lastNewestRef.current = newestId
        setCollapsedIds((prev) => {
          if (!prev.has(newestId)) return prev
          const next = new Set(prev)
          next.delete(newestId)
          return next
        })
      }
      setPurchases(data)
      setLoadedFor(`${farmerId}:${laneId}`)
    } catch {
      setPurchases([])
      setLoadedFor(`${farmerId}:${laneId}`)
      toast.error("Gagal memuat riwayat")
    }
    if (shouldStick) {
      requestAnimationFrame(() => {
        const el = activeBodyRef.current
        if (el) el.scrollTop = el.scrollHeight
      })
    }
  }, [farmerId, laneId])

  useRealtime(laneId, [loadHistory])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- prop-key fetch; setState happens after await
    loadHistory()
  }, [loadHistory, refreshKey])

  function handleActiveScroll() {
    const el = activeBodyRef.current
    if (!el) return
    stickRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80
  }

  function toggleCollapse(id: number) {
    setCollapsedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function openNota(purchaseId: number) {
    window.open(`/pos-2/nota/${purchaseId}?laneId=${laneId}`, "_blank")
  }

  async function handleRequestFinish(purchase: HistoryPurchase) {
    setConfirmPurchase(purchase)
    setSessionCheck(null)
    setChecking(true)
    try {
      const check = await getSessionUnweighed(purchase.id, laneId)
      setSessionCheck(check)
    } catch (err) {
      setConfirmPurchase(null)
      toast.error((err as Error).message)
    } finally {
      setChecking(false)
    }
  }

  async function handleFinishSession(purchaseId: number) {
    setFinishing(purchaseId)
    try {
      await endWeighSession(purchaseId, laneId)
      setConfirmPurchase(null)
      toast.success("Transaksi ditutup — Nota siap dicetak")
      openNota(purchaseId)
      onSessionEnded?.()
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setFinishing(null)
    }
  }

  const totalBales = purchases.reduce((s, p) => s + p.items.length, 0)

  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-card p-4">
        <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-2 mb-3">
          Riwayat Ditimbang
        </p>
        <p className="text-sm text-muted-foreground">Memuat...</p>
      </div>
    )
  }

  if (totalBales === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-4">
        <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-2 mb-3">
          Riwayat Ditimbang{farmerName ? ` — ${farmerName}` : ""}
        </p>
        <p className="text-sm text-muted-foreground">
          {farmerId ? "Belum ada bale untuk petani ini." : "Pilih petani pada antrian untuk melihat bale."}
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-4">
        {purchases.map((purchase, idx) => {
          const hasWeighed = purchase.items.some((i) => i.status === "WEIGHED")
          const isDraft = purchase.status === "DRAFT"
          const isNewest = idx === 0
          const collapsed = collapsedIds.has(purchase.id)
          const totals = purchase.items.reduce(
            (acc, it) => ({
              net: acc.net + (it.netWeight ?? 0),
              subtotal: acc.subtotal + it.subtotal,
            }),
            { net: 0, subtotal: 0 }
          )
          return (
            <div key={purchase.id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
                <button
                  type="button"
                  onClick={() => toggleCollapse(purchase.id)}
                  className="flex items-center gap-2 text-left cursor-pointer group"
                >
                  <ChevronDown
                    className={cn(
                      "w-4 h-4 text-muted-2 transition-transform group-hover:text-foreground",
                      collapsed && "-rotate-90"
                    )}
                  />
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-2 group-hover:text-foreground">
                      {purchase.transactionLabel} — {farmerName}
                    </p>
                    <p className="font-mono text-[10.5px] text-muted-2 mt-0.5">
                      {purchase.transactionCode} · {purchase.items.length} bale
                      {purchase.items.length > 0 && !isDraft
                        ? ` · ${totals.net.toFixed(1)} kg · ${formatCurrency(totals.subtotal)}`
                        : ""}
                    </p>
                  </div>
                </button>
                <div className="flex items-center gap-2 flex-wrap">
                  <StatusPill status={purchase.status === "DRAFT" ? "DRAFT" : "WEIGHED"} />
                  {hasWeighed && isDraft && (
                    <button
                      type="button"
                      onClick={() => handleRequestFinish(purchase)}
                      disabled={finishing === purchase.id}
                      className="px-4 py-1.5 bg-amber hover:bg-amber/80 text-primary-foreground font-extrabold text-[11px] rounded-lg transition-all cursor-pointer disabled:opacity-50"
                    >
                      {finishing === purchase.id ? "Memproses\u2026" : "Akhiri Sesi & Tutup"}
                    </button>
                  )}
                  {hasWeighed && !isDraft && (
                    <button
                      type="button"
                      onClick={() => openNota(purchase.id)}
                      className="px-4 py-1.5 bg-emerald hover:bg-emerald/80 text-primary-foreground font-extrabold text-[11px] rounded-lg transition-all cursor-pointer"
                    >
                      Cetak Nota
                    </button>
                  )}
                </div>
              </div>
              {!collapsed && (
                <div
                  ref={isNewest ? activeBodyRef : undefined}
                  onScroll={isNewest ? handleActiveScroll : undefined}
                  className={cn(
                    "overflow-x-auto",
                    isNewest && "max-h-[45vh] overflow-y-auto"
                  )}
                >
                <table className="w-full min-w-[820px] border-collapse text-[12.5px]">
                  <thead>
                    <tr>
                      <th className="text-left text-[10.5px] uppercase tracking-[0.06em] font-bold text-muted-2 pb-2 pr-2 border-b border-border-soft">No</th>
                      <th className="text-left text-[10.5px] uppercase tracking-[0.06em] font-bold text-muted-2 pb-2 px-2 border-b border-border-soft">Barcode</th>
                      <th className="text-left text-[10.5px] uppercase tracking-[0.06em] font-bold text-muted-2 pb-2 px-2 border-b border-border-soft">Grade</th>
                      <th className="text-left text-[10.5px] uppercase tracking-[0.06em] font-bold text-muted-2 pb-2 px-2 border-b border-border-soft">Customer</th>
                      <th className="text-left text-[10.5px] uppercase tracking-[0.06em] font-bold text-muted-2 pb-2 px-2 border-b border-border-soft">Bruto</th>
                      <th className="text-left text-[10.5px] uppercase tracking-[0.06em] font-bold text-muted-2 pb-2 px-2 border-b border-border-soft">Netto</th>
                      <th className="text-left text-[10.5px] uppercase tracking-[0.06em] font-bold text-muted-2 pb-2 px-2 border-b border-border-soft">Subtotal</th>
                      <th className="text-left text-[10.5px] uppercase tracking-[0.06em] font-bold text-muted-2 pb-2 px-2 border-b border-border-soft">Oleh</th>
                      <th className="text-left text-[10.5px] uppercase tracking-[0.06em] font-bold text-muted-2 pb-2 pl-2 border-b border-border-soft">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {purchase.items.map((item, i) => (
                      <tr
                        key={item.id}
                        onClick={() => onSelectItem?.(item.labelCode)}
                        className="cursor-pointer transition-colors hover:bg-panel-alt/60"
                      >
                        <td className="py-2 pr-2 border-b border-border-soft font-mono text-foreground">{i + 1}</td>
                        <td className="py-2 px-2 border-b border-border-soft font-mono text-foreground">{item.labelCode}</td>
                        <td className="py-2 px-2 border-b border-border-soft font-mono text-foreground">{item.grade}</td>
                        <td className="py-2 px-2 border-b border-border-soft text-foreground">
                          {item.customerName ?? "\u2014"}
                        </td>
                        <td className="py-2 px-2 border-b border-border-soft font-mono text-foreground">
                          {item.grossWeight != null ? `${item.grossWeight.toFixed(1)} kg` : "\u2014"}
                        </td>
                        <td className="py-2 px-2 border-b border-border-soft font-mono text-foreground">
                          {item.netWeight != null ? `${item.netWeight.toFixed(1)} kg` : "\u2014"}
                        </td>
                        <td className="py-2 px-2 border-b border-border-soft font-mono text-foreground">
                          {item.subtotal > 0 ? formatCurrency(item.subtotal) : "\u2014"}
                        </td>
                        <td className="py-2 px-2 border-b border-border-soft font-mono text-foreground">
                          {item.weighedBy ?? "\u2014"}
                        </td>
                        <td className="py-2 pl-2 border-b border-border-soft">
                          <StatusPill status={item.status as "GRADED" | "WEIGHED" | "CLOSED"} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Konfirmasi Akhiri Sesi */}
      {confirmPurchase && (
        <Dialog open onOpenChange={(open) => { if (!open) setConfirmPurchase(null) }}>
          <DialogContent className="sm:max-w-md">
            <DialogTitle>
              {checking
                ? "Memeriksa bale\u2026"
                : sessionCheck && sessionCheck.unweighedCount === 0
                ? "Akhiri Sesi Penimbangan?"
                : "Belum Bisa Menutup Sesi"}
            </DialogTitle>
            <DialogDescription>
              {checking
                ? "Menghitung bale yang belum ditimbang\u2026"
                : sessionCheck && sessionCheck.unweighedCount === 0
                ? `Semua ${sessionCheck.totalBales} bale sudah ditimbang. Lanjut tutup transaksi? Nota akan dibuka di tab baru.`
                : null}
            </DialogDescription>

            {!checking && sessionCheck && sessionCheck.unweighedCount > 0 && (
              <div className="rounded-xl border border-red/35 bg-red/10 p-3">
                <p className="text-[12.5px] font-bold text-red">
                  Masih ada {sessionCheck.unweighedCount} bale belum ditimbang
                </p>
                <p className="text-[11.5px] text-muted-foreground mt-0.5">
                  Sesi tidak dapat ditutup sebelum semua bale ditimbang. Klik bale di bawah untuk
                  memuat ke form timbang.
                </p>
                <div className="mt-2.5 space-y-1.5">
                  {sessionCheck.unweighedBales.map((bale) => (
                    <button
                      type="button"
                      key={bale.labelCode}
                      onClick={() => {
                        onSelectItem?.(bale.labelCode)
                        setConfirmPurchase(null)
                      }}
                      className="w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg bg-panel-alt border border-border-soft text-left hover:border-amber/40 transition-colors cursor-pointer"
                    >
                      <span className="font-mono text-[11.5px] text-foreground">{bale.labelCode}</span>
                      <span className="flex items-center gap-2">
                        <span className="text-[11px] font-mono text-muted-foreground">GRADE {bale.grade}</span>
                        <span className="text-[10px] font-bold bg-amber/12 text-amber border border-amber/35 px-1.5 py-0.5 rounded">
                          GRADED
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <DialogFooter>
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmPurchase(null)}
                  className="px-4 py-1.5 bg-panel-alt text-foreground border border-border-soft font-bold text-[11.5px] rounded-lg cursor-pointer hover:bg-border/50"
                >
                  {sessionCheck && sessionCheck.unweighedCount > 0 ? "Tutup" : "Batal"}
                </button>
                {sessionCheck && sessionCheck.unweighedCount === 0 && !checking && (
                  <button
                    type="button"
                    onClick={() => handleFinishSession(confirmPurchase.id)}
                    disabled={finishing === confirmPurchase.id}
                    className="px-4 py-1.5 bg-emerald hover:bg-emerald/80 text-primary-foreground font-extrabold text-[11.5px] rounded-lg transition-all cursor-pointer disabled:opacity-50"
                  >
                    {finishing === confirmPurchase.id ? "Memproses\u2026" : "Akhiri & Tutup"}
                  </button>
                )}
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}
