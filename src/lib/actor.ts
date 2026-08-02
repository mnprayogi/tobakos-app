import { auth } from "@/lib/auth"

export async function getActorName(): Promise<string | null> {
  const session = await auth()
  return session?.user?.name ?? null
}
