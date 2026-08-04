import { auth } from "@/lib/auth"
import { subscribe, type SseEvent } from "@/lib/events"

export const dynamic = "force-dynamic"

const HEARTBEAT_MS = 15_000

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 })
  }

  const url = new URL(request.url)
  const laneParam = url.searchParams.get("laneId")
  const parsedLane = laneParam ? Number(laneParam) : null
  const laneId =
    parsedLane != null && Number.isFinite(parsedLane) && parsedLane > 0
      ? parsedLane
      : null

  const encoder = new TextEncoder()

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false

      const send = (event: SseEvent) => {
        if (closed) return
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))
        } catch {
          // koneksi putus
        }
      }

      const unsubscribe = subscribe(laneId, send)

      send({ type: "connected", at: Date.now() })

      const heartbeat = setInterval(() => {
        if (closed) return
        try {
          controller.enqueue(encoder.encode(": ping\n\n"))
        } catch {
          // koneksi putus
        }
      }, HEARTBEAT_MS)

      request.signal.addEventListener("abort", () => {
        closed = true
        clearInterval(heartbeat)
        unsubscribe()
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
