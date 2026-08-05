import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"

export const proxy = auth((req) => {
  const { pathname } = req.nextUrl
  const session = req.auth

  if (!session?.user && pathname !== "/login") {
    return NextResponse.redirect(new URL("/login", req.url))
  }

  const role = session?.user?.role

  if (role === "SUPER_ADMIN") {
    return NextResponse.next()
  }

  if (pathname.startsWith("/pos-1") && role !== "GRADER" && role !== "ADMIN") {
    return NextResponse.redirect(new URL("/login", req.url))
  }

  if (pathname.startsWith("/pos-2") && role !== "OPERATOR" && role !== "ADMIN") {
    return NextResponse.redirect(new URL("/login", req.url))
  }

  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    const adminOnly = ["/admin/master-data", "/admin/settings"]
    const staff = ["/admin/transactions"]
    const readOnly = ["/admin/debt", "/admin/loans", "/admin/reports"]

    const isAdminOnly =
      pathname === "/admin" ||
      adminOnly.some((p) => pathname === p || pathname.startsWith(p + "/"))
    const isStaff = staff.some((p) => pathname === p || pathname.startsWith(p + "/"))
    const isReadOnly = readOnly.some((p) => pathname === p || pathname.startsWith(p + "/"))

    if (isAdminOnly && role !== "ADMIN") {
      return NextResponse.redirect(new URL("/login", req.url))
    }
    if (isStaff && role !== "ADMIN" && role !== "FINANCE") {
      return NextResponse.redirect(new URL("/login", req.url))
    }
    if (isReadOnly && role !== "ADMIN" && role !== "FINANCE" && role !== "OWNER") {
      return NextResponse.redirect(new URL("/login", req.url))
    }
    if (!isAdminOnly && !isStaff && !isReadOnly) {
      return NextResponse.redirect(new URL("/login", req.url))
    }
  }

  return NextResponse.next()
})

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
}
