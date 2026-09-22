// Penyimpanan progres impor persisten di database (tabel import_jobs).
//
// Berbeda dari implementasi in-memory sebelumnya: Server Action dan Route
// Handler di Next.js di-bundle terpisah sehingga Map di memori proses tidak
// dibagikan — GET /api/import/progress selalu 404. Dengan persist ke DB,
// progress dapat dibaca dari runtime mana pun dan aman untuk multi-instance.

import { prisma } from "@/lib/db"

export type ImportPhase = "master" | "importing" | "finalize" | "done" | "error"

export interface ImportProgress {
  phase: ImportPhase
  message: string
  total: number
  processed: number
  imported: number
  skipped: number
  generatedLabels: number
  bales: number
  currentLabel?: string
  updatedAt: number
}

// Entri dihapus N ms setelah selesai/gagal; job basi (tanpa update) dibersihkan di getJob.
const DELETE_AFTER_FINISH_MS = 8_000
const STALE_AFTER_MS = 5 * 60_000

function toProgress(row: {
  phase: string
  message: string
  total: number
  processed: number
  imported: number
  skipped: number
  generatedLabels: number
  bales: number
  currentLabel: string | null
  updatedAt: Date
}): ImportProgress {
  return {
    phase: row.phase as ImportPhase,
    message: row.message,
    total: row.total,
    processed: row.processed,
    imported: row.imported,
    skipped: row.skipped,
    generatedLabels: row.generatedLabels,
    bales: row.bales,
    currentLabel: row.currentLabel ?? undefined,
    updatedAt: row.updatedAt.getTime(),
  }
}

export async function createJob(id: string, total: number, data?: string): Promise<void> {
  await prisma.importJob.upsert({
    where: { jobId: id },
    update: { total, phase: "master", message: "Menyiapkan master data…", ...(data != null ? { data } : {}) },
    create: {
      jobId: id,
      phase: "master",
      message: "Menyiapkan master data…",
      total,
      processed: 0,
      imported: 0,
      skipped: 0,
      generatedLabels: 0,
      bales: 0,
      ...(data != null ? { data } : {}),
    },
  })
}

export async function updateJob(id: string, patch: Partial<ImportProgress>): Promise<void> {
  await prisma.importJob
    .update({
      where: { jobId: id },
      data: {
        phase: patch.phase,
        message: patch.message,
        processed: patch.processed,
        imported: patch.imported,
        skipped: patch.skipped,
        generatedLabels: patch.generatedLabels,
        bales: patch.bales,
        currentLabel: patch.currentLabel,
      },
    })
    .catch((err) => {
      // job bisa saja sudah dihapus / belum dibuat — abaikan, tapi catat di dev
      if (process.env.NODE_ENV === "development") {
        console.warn("[import-job] updateJob gagal (progress), dilanjutkan.", err instanceof Error ? err.message : err)
      }
    })
}

export async function finishJob(id: string, patch: Partial<ImportProgress>): Promise<void> {
  // Upsert, bukan update: status terminal wajib tersimpan walau baris sempat
  // lenyap (timer delete impor sebelumnya / pembersih job basi di getJob) —
  // klien harus selalu bisa membaca phase done/error selama window DELETE_AFTER_FINISH_MS.
  await prisma.importJob.upsert({
    where: { jobId: id },
    update: {
      phase: patch.phase,
      message: patch.message,
      processed: patch.processed,
      imported: patch.imported,
      skipped: patch.skipped,
      generatedLabels: patch.generatedLabels,
      bales: patch.bales,
      currentLabel: patch.currentLabel ?? null,
    },
    create: {
      jobId: id,
      phase: patch.phase ?? "done",
      message: patch.message ?? "Import selesai.",
      total: patch.processed ?? 0,
      processed: patch.processed ?? 0,
      imported: patch.imported ?? 0,
      skipped: patch.skipped ?? 0,
      generatedLabels: patch.generatedLabels ?? 0,
      bales: patch.bales ?? 0,
      currentLabel: patch.currentLabel ?? null,
    },
  })
  setTimeout(() => {
    prisma.importJob.delete({ where: { jobId: id } }).catch(() => {})
  }, DELETE_AFTER_FINISH_MS)
}

export async function getJob(id: string): Promise<ImportProgress | null> {
  const row = await prisma.importJob.findUnique({ where: { jobId: id } })
  if (!row) return null
  const ageMs = Date.now() - row.updatedAt.getTime()
  if (ageMs > STALE_AFTER_MS) {
    await prisma.importJob.delete({ where: { jobId: id } }).catch(() => {})
    return null
  }
  return toProgress(row)
}