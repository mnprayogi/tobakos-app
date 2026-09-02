import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { z } from "zod"

const scaleSchema = z.object({
  weight: z.number().finite().min(0).max(100_000),
})

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json()
  const parsed = scaleSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid weight" }, { status: 400 })
  }

  return NextResponse.json({ received: parsed.data.weight })
}