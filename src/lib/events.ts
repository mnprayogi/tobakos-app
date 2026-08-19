// Event bus real-time — DB-backed (tabel app_events).
//
// MULTI-INSTANCE SAFE: event tersimpan di database, sehingga aman dipakai
// di hosting serverless (Vercel) maupun beberapa instance. Konsumen membaca
// lewat SSE polling di /api/events (query `id > lastId` per interval).

import { prisma } from "@/lib/db"

export interface SseEvent {
  type: string
  laneId?: number | null
  at: number
}

export function publishEvent(type: string, laneId?: number | null): void {
  void prisma.appEvent
    .create({
      data: {
        type,
        laneId: laneId ?? null,
        at: new Date(),
      },
    })
    .catch(() => {
      // kegagalan menulis event tidak boleh menggagalkan transaksi utama
    })
}
