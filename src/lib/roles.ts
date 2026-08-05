import { auth } from "@/lib/auth"

export async function getSessionRole(): Promise<string | null> {
  const session = await auth()
  return session?.user?.role ?? null
}

export function assertRole(role: string | null, allowed: string[]): void {
  if (role === "SUPER_ADMIN") return
  if (!role || !allowed.includes(role)) {
    throw new Error("Anda tidak memiliki akses untuk aksi ini")
  }
}

export async function requireRoles(...roles: string[]): Promise<string> {
  const session = await auth()
  assertRole(session?.user?.role ?? null, roles)
  return session?.user?.name ?? ""
}

export async function canAccess(roles: string[]): Promise<boolean> {
  const role = await getSessionRole()
  return role !== null && roles.includes(role)
}
