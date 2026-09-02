import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { z } from "zod"

const printSchema = z.object({
  labelCode: z.string().min(1),
  grade: z.string().min(1),
  warehouse: z.string().min(1),
})

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json()
  const parsed = printSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Missing or invalid required fields" }, { status: 400 })
  }

  return NextResponse.json({ printed: true, labelCode: parsed.data.labelCode })
}