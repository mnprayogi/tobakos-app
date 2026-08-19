import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

export const dynamic = "force-dynamic"

const POLL_MS = 1_500
const HEARTBEAT_MS = 15_000
const CLEANUP_INTERVAL = 1_000
const MAX_EVENTS_PER_POLL = 100
const EVENT_RETENTION_MS = 24 * 60 * 60 * 1_000

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 })
  }

  // Catatan: query param `laneId` tetap diterima (kompatibilitas URL client),
  // namun diabaikan — semua event dikirim ke semua client yang terautentikasi.

  const encoder = new TextEncoder()
  let lastId = BigInt(0)

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let closed = false
      let polls = 0

      try {
        const max = await prisma.appEvent.aggregate({ _max: { id: true } })
        lastId = max._max.id ?? BigInt(0)
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

      const sendEvent = (type: string, laneIdValue: number | null, at: number) => {
        send(`data: ${JSON.stringify({ type, laneId: laneIdValue, at })}\n\n`)
      }

      sendEvent("connected", null, Date.now())

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
            where: { id: { gt: lastId } },
            orderBy: { id: "asc" },
            take: MAX_EVENTS_PER_POLL,
            select: { id: true, type: true, laneId: true, at: true },
          })
          for (const event of events) {
            if (closed) return
            sendEvent(event.type, event.laneId, Number(event.at.getTime()))
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
