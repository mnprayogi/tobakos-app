import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import type { Session } from "next-auth"
import type { Prisma } from "@/generated/prisma/client"

const laneInclude = {
  warehouse: { select: { id: true, code: true, name: true } },
} satisfies Prisma.LaneInclude

export type LaneWithWarehouse = Prisma.LaneGetPayload<{ include: typeof laneInclude }>

export async function getCurrentUserLane(session?: Session | null): Promise<LaneWithWarehouse | null> {
  const s = session ?? (await auth())
  if (!s?.user?.id) return null
  const user = await prisma.user.findUnique({
    where: { id: s.user.id },
    select: { laneId: true },
  })
  if (user?.laneId == null) return null
  const lane = await prisma.lane.findUnique({
    where: { id: user.laneId },
    include: laneInclude,
  })
  return lane
}

export async function resolveActorLane(opts?: {
  laneId?: number | null
  laneCode?: string | null
}): Promise<LaneWithWarehouse> {
  const session = await auth()
  if (session?.user?.id) {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { laneId: true },
    })
    if (user?.laneId != null) {
      const lane = await prisma.lane.findUnique({
        where: { id: user.laneId },
        include: laneInclude,
      })
      if (lane) return lane
    }
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
