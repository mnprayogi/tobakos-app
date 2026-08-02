"use client"

import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"
import type { GradeInput } from "@/lib/actions/grading"
import type { WeighInput } from "@/lib/actions/weighing"

export type QueuedAction =
  | { id: string; type: "GRADE"; payload: GradeInput; createdAt: number }
  | { id: string; type: "WEIGH"; payload: WeighInput; createdAt: number }

export type NewQueuedAction =
  | { type: "GRADE"; payload: GradeInput }
  | { type: "WEIGH"; payload: WeighInput }

interface QueueState {
  pending: QueuedAction[]
  online: boolean
  enqueue: (action: NewQueuedAction) => void
  remove: (id: string) => void
  setOnline: (v: boolean) => void
}

export const useQueueStore = create<QueueState>()(
  persist(
    (set) => ({
      pending: [],
      online: typeof navigator !== "undefined" ? navigator.onLine : true,
      enqueue: (action) =>
        set((s) => {
          const full: QueuedAction =
            action.type === "GRADE"
              ? { id: crypto.randomUUID(), type: "GRADE", payload: action.payload, createdAt: Date.now() }
              : { id: crypto.randomUUID(), type: "WEIGH", payload: action.payload, createdAt: Date.now() }
          return { pending: [...s.pending, full] }
        }),
      remove: (id) => set((s) => ({ pending: s.pending.filter((a) => a.id !== id) })),
      setOnline: (v) => set({ online: v }),
    }),
    {
      name: "tobakos-offline-queue",
      storage: createJSONStorage(() => window.localStorage),
      partialize: (s) => ({ pending: s.pending }),
    }
  )
)
