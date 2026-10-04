"use client"

import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"
import type { GradeInput } from "@/lib/actions/grading"
import type { WeighInput } from "@/lib/actions/weighing"
import { randomUUID } from "@/lib/utils"

import type { SusulanBatchInput } from "@/lib/actions/susulan"

export type QueuedAction =
  | { id: string; type: "GRADE"; payload: GradeInput; createdAt: number }
  | { id: string; type: "WEIGH"; payload: WeighInput; createdAt: number }
  | { id: string; type: "SUSULAN_BATCH"; payload: SusulanBatchInput; createdAt: number }

export type NewQueuedAction =
  | { type: "GRADE"; payload: GradeInput }
  | { type: "WEIGH"; payload: WeighInput }
  | { type: "SUSULAN_BATCH"; payload: SusulanBatchInput }

interface QueueState {
  pending: QueuedAction[]
  syncing: Record<string, boolean>
  online: boolean
  enqueue: (action: NewQueuedAction) => void
  remove: (id: string) => void
  setOnline: (v: boolean) => void
  markSyncing: (id: string) => void
  unmarkSyncing: (id: string) => void
}

export const useQueueStore = create<QueueState>()(
  persist(
    (set) => ({
      pending: [],
      syncing: {},
      online: typeof navigator !== "undefined" ? navigator.onLine : true,
      enqueue: (action) =>
        set((s) => {
          const createdAt = Date.now()
          const id = randomUUID()
          let full: QueuedAction
          if (action.type === "GRADE") {
            full = { id, type: "GRADE", payload: action.payload, createdAt }
          } else if (action.type === "WEIGH") {
            full = { id, type: "WEIGH", payload: action.payload, createdAt }
          } else {
            full = { id, type: "SUSULAN_BATCH", payload: action.payload, createdAt }
          }
          return { pending: [...s.pending, full] }
        }),
      remove: (id) => set((s) => ({ pending: s.pending.filter((a) => a.id !== id) })),
      setOnline: (v) => set({ online: v }),
      markSyncing: (id) => set((s) => ({ syncing: { ...s.syncing, [id]: true } })),
      unmarkSyncing: (id) =>
        set((s) => {
          if (!s.syncing[id]) return s
          const next = { ...s.syncing }
          delete next[id]
          return { syncing: next }
        }),
    }),
    {
      name: "tobakos-offline-queue",
      storage: createJSONStorage(() => window.localStorage),
      partialize: (s) => ({ pending: s.pending }),
    }
  )
)
