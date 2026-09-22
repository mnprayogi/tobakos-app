import { auth } from "@/lib/auth"
import { getJob } from "@/lib/import/progress"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 })
  }

  const role = session.user.role as string
  if (!["ADMIN", "OWNER", "SUPER_ADMIN"].includes(role)) {
    return new Response("Forbidden", { status: 403 })
  }

  const url = new URL(request.url)
  const jobId = url.searchParams.get("job")
  if (!jobId) {
    return Response.json({ error: "job param diperlukan" }, { status: 400 })
  }

  const job = await getJob(jobId)
  if (!job) {
    return Response.json({ error: "not_found" }, { status: 404 })
  }

  return Response.json({ job })
}