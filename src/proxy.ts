import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"

export const proxy = auth((req) => {
  const { pathname } = req.nextUrl
  const session = req.auth

  if (!session?.user && pathname !== "/login" && pathname !== "/") {
    return NextResponse.redirect(new URL("/login", req.url))
  }

  const role = session?.user?.role
  const deny = () =>
    NextResponse.redirect(new URL(session?.user ? "/dashboard" : "/login", req.url))

  if (role === "SUPER_ADMIN") {
    return NextResponse.next()
  }

  const isPortal = pathname === "/portal" || pathname.startsWith("/portal/")
  if (isPortal) {
    if (role !== "CUSTOMER") return deny()
    return NextResponse.next()
  }
  if (role === "CUSTOMER") {
    return NextResponse.redirect(new URL("/portal", req.url))
  }

  if (pathname.startsWith("/pos-1") && role !== "GRADER" && role !== "ADMIN") {
    return deny()
  }

  const isPos2Transactions =
    pathname === "/pos-2/transactions" || pathname.startsWith("/pos-2/transactions/")
  if (
    isPos2Transactions &&
    role !== "OPERATOR" &&
    role !== "ADMIN"
  ) {
    return deny()
  }
  if (
    pathname.startsWith("/pos-2") &&
    !isPos2Transactions &&
    role !== "OPERATOR" &&
    role !== "ADMIN"
  ) {
    return deny()
  }

  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    const adminOnly = ["/admin/master-data", "/admin/settings"]
    const staff = ["/admin/transactions"]
    const readOnly = ["/admin/debt", "/admin/loans", "/admin/reports", "/admin/kas", "/admin/bank"]

    const isAdminOnly =
      pathname === "/admin" ||
      adminOnly.some((p) => pathname === p || pathname.startsWith(p + "/"))
    const isStaff = staff.some((p) => pathname === p || pathname.startsWith(p + "/"))
    const isReadOnly = readOnly.some((p) => pathname === p || pathname.startsWith(p + "/"))

    if (isAdminOnly && role !== "ADMIN") {
      return deny()
    }
    if (isStaff && role !== "ADMIN" && role !== "FINANCE" && role !== "OWNER") {
      return deny()
    }
    if (isReadOnly && role !== "ADMIN" && role !== "FINANCE" && role !== "OWNER") {
      return deny()
    }
    if (!isAdminOnly && !isStaff && !isReadOnly) {
      return deny()
    }
  }

  return NextResponse.next()
})

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|icons|manifest.webmanifest|serwist|~offline).*)",
  ],
}
