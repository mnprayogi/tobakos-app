import { cache } from "react"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import type { Prisma } from "@/generated/prisma/client"

const laneInclude = {
  warehouse: { select: { id: true, code: true, name: true } },
} satisfies Prisma.LaneInclude

export type LaneWithWarehouse = Prisma.LaneGetPayload<{ include: typeof laneInclude }>

export const getCurrentUserLane = cache(async (key?: string | null): Promise<LaneWithWarehouse | null> => {
  const userId = key || (await auth())?.user?.id || null
  if (!userId) return null
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { lane: { include: laneInclude } },
  })
  return user?.lane ?? null
})

export async function resolveActorLane(opts?: {
  laneId?: number | null
  laneCode?: string | null
}): Promise<LaneWithWarehouse> {
  const session = await auth()
  if (session?.user?.id) {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { lane: { include: laneInclude } },
    })
    if (user?.lane) return user.lane
  }

  const fallbackId = opts?.laneId ?? null
  const fallbackCode = opts?.laneCode ?? null
  if (fallbackId != null) {
    const lane = await prisma.lane.findUnique({ where: { id: fallbackId }, include: laneInclude })
    if (lane) return lane
  }
  if (fallbackCode) {
    const lane = await prisma.lane.findUnique({ where: { code: fallbackCode }, include: laneInclude })
    if (lane) return lane
  }
  throw new Error("User tidak memiliki penugasan jalur")
}