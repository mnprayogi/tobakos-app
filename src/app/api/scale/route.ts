import { NextResponse } from "next/server"

export async function POST(request: Request) {
  const body = await request.json()
  const { weight } = body

  if (typeof weight !== "number") {
    return NextResponse.json({ error: "Invalid weight" }, { status: 400 })
  }

  return NextResponse.json({ received: weight })
}
