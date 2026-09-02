import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { getCurrentUserLane } from "@/lib/lane-resolution"
import { resolveWarehouseScope } from "@/lib/actions/scope"
import type { Prisma } from "@/generated/prisma/client"

export const dynamic = "force-dynamic"

const POLL_MS = 1_500
const HEARTBEAT_MS = 15_000
const CLEANUP_INTERVAL = 1_000
const MAX_EVENTS_PER_POLL = 100
const EVENT_RETENTION_MS = 24 * 60 * 60 * 1_000

const BALE_TYPES = ["bale.created", "bale.deleted", "bale.weighed", "session.ended"]
const FINANCIAL_TYPES = [
  "payment.recorded",
  "payment.voided",
  "purchase.approved",
  "purchase.reopened",
  "purchase.voided",
  "loan.updated",
  "cash.updated",
]

type EventScope = Prisma.AppEventWhereInput

async function buildEventFilter(role: string): Promise<EventScope> {
  if (role === "SUPER_ADMIN" || role === "OWNER" || role === "ADMIN") {
    // Admin/owner/super admin melihat semua event
    return {}
  }

  if (role === "GRADER" || role === "OPERATOR") {
    const lane = await getCurrentUserLane()
    // Tanpa lane valid (mis. dashboard shared-tablet) → koneksi kosong,
    // tidak ada event yang dikirim (polling fallback di client tetap bekerja).
    if (!lane) return { type: { in: [] } }
    return {
      type: { in: BALE_TYPES },
      laneId: lane.id,
    }
  }

  if (role === "FINANCE") {
    let scope
    try {
      scope = await resolveWarehouseScope()
    } catch {
      // FINANCE tanpa gudang → koneksi kosong, hindari kebocoran
      return { type: { in: [] } }
    }
    if (scope.mode === "all") {
      return {}
    }
    const lanes = await prisma.lane.findMany({
      where: { warehouseId: scope.warehouseId },
      select: { id: true },
    })
    const laneIds = lanes.map((l) => l.id)
    return {
      OR: [
        // Financial events tidak punya laneId — terima semuanya
        { type: { in: FINANCIAL_TYPES } },
        // Bale events hanya dari gudang sendiri
        { type: { in: BALE_TYPES }, laneId: { in: laneIds } },
      ],
    }
  }

  // Role lain (mis. CUSTOMER sudah ditolak di atas) — fallback aman: tanpa event
  return { type: { in: [] } }
}

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 })
  }

  const role = session.user.role as string
  if (role === "CUSTOMER") {
    return new Response("Forbidden", { status: 403 })
  }

  const eventFilter = await buildEventFilter(role)

  // Dukungan replay setelah reconnect: EventSource mengirim Last-Event-ID
  const lastEventIdHeader = request.headers.get("last-event-id")
  let initialId = BigInt(0)
  if (lastEventIdHeader && /^\d+$/.test(lastEventIdHeader)) {
    initialId = BigInt(lastEventIdHeader)
  }

  const encoder = new TextEncoder()
  let lastId = initialId

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let closed = false
      let polls = 0

      try {
        if (lastId === BigInt(0)) {
          const max = await prisma.appEvent.aggregate({ _max: { id: true } })
          lastId = max._max.id ?? BigInt(0)
        }
      } catch {
        // DB belum siap — mulai dari 0, event lama akan di-replay sekali
      }

      const send = (data: string) => {
        if (closed) return
        try {
          controller.enqueue(encoder.encode(data))
        } catch {
          // koneksi putus
        }
      }

      const sendEvent = (id: bigint, type: string, laneIdValue: number | null, at: number) => {
        send(`data: ${JSON.stringify({ type, laneId: laneIdValue, at })}\nid: ${id}\n\n`)
      }

      // Event "connected" tanpa id: field — tidak boleh jadi Last-Event-ID (0)
      send(`data: ${JSON.stringify({ type: "connected", laneId: null, at: Date.now() })}\n\n`)

      const heartbeat = setInterval(() => {
        if (closed) return
        try {
          controller.enqueue(encoder.encode(": ping\n\n"))
        } catch {
          // koneksi putus
        }
      }, HEARTBEAT_MS)

      const poll = async () => {
        if (closed) return
        try {
          const events = await prisma.appEvent.findMany({
            // Bangun filter setiap poll supaya `lastId` selalu fresh
            where: { ...eventFilter, id: { gt: lastId } },
            orderBy: { id: "asc" },
            take: MAX_EVENTS_PER_POLL,
            select: { id: true, type: true, laneId: true, at: true },
          })
          for (const event of events) {
            if (closed) return
            sendEvent(event.id, event.type, event.laneId, Number(event.at.getTime()))
            lastId = event.id
          }

          polls += 1
          if (polls % CLEANUP_INTERVAL === 0) {
            void prisma.appEvent
              .deleteMany({ where: { at: { lt: new Date(Date.now() - EVENT_RETENTION_MS) } } })
              .catch(() => {
                // cleanup gagal — abaikan, akan diulang berikutnya
              })
          }
        } catch {
          // query gagal (mis. DB sempat turun) — lanjut polling berikutnya
        }
      }

      const timer = setInterval(() => void poll(), POLL_MS)

      request.signal.addEventListener("abort", () => {
        closed = true
        clearInterval(heartbeat)
        clearInterval(timer)
        try {
          controller.close()
        } catch {
          // stream sudah tertutup
        }
      })
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  })
}