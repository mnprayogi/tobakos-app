import { NextResponse } from "next/server"

export async function POST(request: Request) {
  const body = await request.json()
  const { labelCode, grade, warehouse } = body

  if (!labelCode || !grade || !warehouse) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
  }

  return NextResponse.json({ printed: true, labelCode })
}
