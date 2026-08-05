import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"

export default async function Home() {
  const session = await auth()

  if (!session?.user) {
    redirect("/login")
  }

  const role = session.user.role
  if (role === "ADMIN") redirect("/dashboard")
  if (role === "GRADER") redirect("/dashboard")
  if (role === "OPERATOR") redirect("/dashboard")
  if (role === "FINANCE") redirect("/dashboard")
  if (role === "OWNER") redirect("/dashboard")
  if (role === "SUPER_ADMIN") redirect("/dashboard")

  redirect("/login")
}
