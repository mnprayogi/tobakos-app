"use client"

import Link from "next/link"
import { useMemo } from "react"
import { usePathname } from "next/navigation"
import { signOut } from "next-auth/react"

import { cn } from "@/lib/utils"

const ALL_ROLES = ["GRADER", "OPERATOR", "FINANCE", "ADMIN", "OWNER", "SUPER_ADMIN"]

const navItems = [
  {
    section: "Alur Kerja",
    items: [
      {
        href: "/dashboard",
        label: "Dashboard",
        roles: ALL_ROLES,
        icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="9" rx="1" />
            <rect x="14" y="3" width="7" height="5" rx="1" />
            <rect x="14" y="12" width="7" height="9" rx="1" />
            <rect x="3" y="16" width="7" height="5" rx="1" />
          </svg>
        ),
      },
      {
        href: "/pos-1/grading",
        label: "Pos 1 · Grading",
        roles: ["GRADER", "ADMIN"],
        icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 20V10M18 20V4M6 20v-6" />
          </svg>
        ),
      },
      {
        href: "/pos-2/weighing",
        label: "Pos 2 · Penimbangan",
        roles: ["OPERATOR", "ADMIN"],
        icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v5l3 2" />
          </svg>
        ),
      },
      {
        href: "/pos-2/transactions",
        label: "Pos 2 · Transaksi",
        roles: ["OPERATOR", "ADMIN", "FINANCE"],
        icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
          </svg>
        ),
      },
    ],
  },
  {
    section: "Admin",
    items: [
      {
        href: "/admin/master-data",
        label: "Master Data",
        roles: ["ADMIN"],
        icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <ellipse cx="12" cy="5" rx="9" ry="3" />
            <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
            <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
          </svg>
        ),
      },
      {
        href: "/admin/transactions",
        label: "Transaksi",
        roles: ["ADMIN", "FINANCE", "OWNER"],
        icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
          </svg>
        ),
      },
      {
        href: "/admin/debt",
        label: "Hutang Transaksi",
        roles: ["ADMIN", "FINANCE", "OWNER"],
        icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 6h18M4 6v13a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V6" />
            <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            <path d="M10 11h4" />
          </svg>
        ),
      },
      {
        href: "/admin/loans",
        label: "Hutang Modal",
        roles: ["ADMIN", "FINANCE", "OWNER"],
        icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 6v12" />
            <path d="M15.5 8.5c-.7-1-2-1.5-3.5-1.5-1.6 0-3 .8-3 2 0 3 6.5 1.5 6.5 4.5 0 1.2-1.4 2-3 2-1.6 0-2.9-.6-3.5-1.6" />
          </svg>
        ),
      },
      {
        href: "/admin/kas",
        label: "Kas",
        roles: ["ADMIN", "FINANCE", "OWNER"],
        icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="6" width="20" height="12" rx="2" />
            <circle cx="12" cy="12" r="2.5" />
            <path d="M6 12h.01M18 12h.01" />
          </svg>
        ),
      },
      {
        href: "/admin/reports",
        label: "Laporan",
        roles: ["ADMIN", "FINANCE", "OWNER"],
        icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21.21 15.89A10 10 0 1 1 8 2.83" />
            <path d="M22 12A10 10 0 0 0 12 2v10z" />
          </svg>
        ),
      },
      {
        href: "/admin/settings",
        label: "Pengaturan",
        roles: ["ADMIN"],
        icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        ),
      },
    ],
  },
]

export function Sidebar({
  role,
  userName,
  companyName,
  collapsed = false,
  mobileOpen = false,
  onNavigate,
}: {
  role: string
  userName: string
  companyName: string
  collapsed?: boolean
  mobileOpen?: boolean
  onNavigate?: () => void
}) {
  const pathname = usePathname()

  const navItemsForRole = useMemo(
    () =>
      navItems
        .map((section) => ({
          ...section,
          items: section.items.filter(
            (item) => role === "SUPER_ADMIN" || item.roles.includes(role)
          ),
        }))
        .filter((section) => section.items.length > 0),
    [role]
  )

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-50 flex w-60 flex-col border-r border-border bg-sidebar p-4 transition-[width,transform] duration-200 lg:sticky lg:inset-auto lg:top-0 lg:h-screen lg:translate-x-0",
        collapsed ? "lg:w-16 lg:px-2.5 lg:py-5" : "lg:w-60 lg:p-5",
        mobileOpen ? "translate-x-0" : "-translate-x-full"
      )}
    >
      <div className={cn("flex items-center gap-2.5 pb-5 px-1.5 border-b border-border-soft mb-4", collapsed && "lg:justify-center lg:px-0")}>
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-emerald to-emerald/70 text-[10px] font-bold flex-shrink-0 text-primary-foreground">
          🌿
        </div>
        <span className={cn("font-extrabold text-[17px] tracking-tight text-foreground flex items-center", collapsed && "lg:hidden")}>
          {companyName}
          <span className="font-mono text-[9.5px] font-bold bg-border text-muted-2 px-1.5 py-0.5 rounded ml-1.5 align-middle">
            OS
          </span>
        </span>
      </div>

      {navItemsForRole.map((section) => {
        return (
          <div key={section.section} className="mb-5">
            <p className={cn("text-[10px] uppercase tracking-[0.1em] font-bold text-muted-2 px-2.5 mb-2", collapsed && "lg:hidden")}>
              {section.section}
            </p>
            <div className="flex flex-col gap-0.5">
              {section.items.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={collapsed ? item.label : undefined}
                    onClick={onNavigate}
                    className={cn(
                      "flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[13.5px] font-semibold border border-transparent transition-all duration-150",
                      collapsed && "lg:justify-center lg:px-0",
                      isActive
                        ? "bg-emerald/12 text-emerald border-emerald/30"
                        : "text-foreground/65 hover:bg-panel-alt hover:text-foreground"
                    )}
                  >
                    {item.icon && item.icon}
                    <span className={cn(collapsed && "lg:hidden")}>{item.label}</span>
                  </Link>
                )
              })}
            </div>
          </div>
        )
      })}

      <div className="mt-auto pt-3.5 border-t border-border-soft text-[10.5px] text-muted-2 leading-relaxed">
        <div className={cn("px-1.5", collapsed && "lg:hidden")}>
          {userName}<br />{companyName} · Gudang 01
        </div>
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/login" })}
          className={cn(
            "mt-2.5 w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[13px] font-bold text-red-deduction border border-border-soft hover:bg-red-deduction/10 hover:border-red-deduction/40 transition-all duration-150 cursor-pointer",
            collapsed && "lg:justify-center lg:px-0"
          )}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          <span className={cn(collapsed && "lg:hidden")}>Keluar</span>
        </button>
      </div>
    </aside>
  )
}
