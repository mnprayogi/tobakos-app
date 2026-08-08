"use client"

import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import {
  AlertCircle,
  ArrowRight,
  Eye,
  EyeOff,
  Leaf,
  LoaderCircle,
  LockKeyhole,
  Scale,
  ScanLine,
  ShieldCheck,
  User,
} from "lucide-react"

import { cn } from "@/lib/utils"

const WORKFLOW = [
  {
    label: "Pos 1 · Grading",
    desc: "Input bale, pilih grade, cetak label",
    pill: "pill-graded",
    status: "GRADED",
    icon: ScanLine,
  },
  {
    label: "Pos 2 · Penimbangan",
    desc: "Scan label, ambil berat, hitung netto",
    pill: "pill-weighed",
    status: "WEIGHED",
    icon: Scale,
  },
  {
    label: "Penutupan Transaksi",
    desc: "Review, negosiasi harga & pembayaran",
    pill: "pill-closed",
    status: "CLOSED",
    icon: ShieldCheck,
  },
] as const

function BrandMark({ size = "md" }: { size?: "md" | "lg" }) {
  return (
    <div className="flex items-center gap-2.5">
      <div
        className={cn(
          "flex items-center justify-center bg-gradient-to-br from-emerald to-emerald/70 text-primary-foreground",
          size === "lg" ? "h-10 w-10 rounded-xl" : "h-8 w-8 rounded-lg"
        )}
      >
        <Leaf className={size === "lg" ? "size-5" : "size-4"} />
      </div>
      <span className="flex items-center text-lg font-extrabold tracking-tight text-foreground lg:text-xl">
        TobakOS
        <span className="ml-1.5 rounded-md bg-border px-1.5 py-0.5 align-middle font-mono text-[9px] font-bold tracking-wide text-muted-2">
          OS
        </span>
      </span>
    </div>
  )
}

type RoutePoint = { x: number; y: number; delay: number }

type Route = { start: RoutePoint; end: RoutePoint }

const ROUTES: Route[] = [
  { start: { x: 120, y: 200, delay: 0 }, end: { x: 240, y: 110, delay: 2 } },
  { start: { x: 240, y: 110, delay: 2 }, end: { x: 320, y: 160, delay: 4 } },
  { start: { x: 60, y: 70, delay: 1 }, end: { x: 180, y: 240, delay: 3 } },
  { start: { x: 340, y: 80, delay: 0.5 }, end: { x: 220, y: 240, delay: 2.5 } },
  { start: { x: 90, y: 130, delay: 1.5 }, end: { x: 200, y: 60, delay: 3.5 } },
  { start: { x: 290, y: 200, delay: 2.2 }, end: { x: 160, y: 130, delay: 4.5 } },
]

type Dot = { x: number; y: number; radius: number; opacity: number }

function generateDots(width: number, height: number): Dot[] {
  const dots: Dot[] = []
  const gap = 14
  const radius = 1.2

  for (let x = 0; x < width; x += gap) {
    for (let y = 0; y < height; y += gap) {
      const isInMapShape =
        ((x < width * 0.28 && x > width * 0.05) && (y < height * 0.42 && y > height * 0.08)) ||
        ((x < width * 0.28 && x > width * 0.16) && (y < height * 0.85 && y > height * 0.42)) ||
        ((x < width * 0.48 && x > width * 0.32) && (y < height * 0.38 && y > height * 0.14)) ||
        ((x < width * 0.52 && x > width * 0.37) && (y < height * 0.68 && y > height * 0.38)) ||
        ((x < width * 0.74 && x > width * 0.48) && (y < height * 0.52 && y > height * 0.08)) ||
        ((x < width * 0.84 && x > width * 0.68) && (y < height * 0.84 && y > height * 0.62))

      if (isInMapShape && Math.random() > 0.3) {
        dots.push({
          x,
          y,
          radius,
          opacity: Math.random() * 0.35 + 0.12,
        })
      }
    }
  }
  return dots
}

const DOT_COLOR = "96, 165, 250"
const ROUTE_COLOR = "#22c98d"

function DotMap() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 })

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const resizeObserver = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect
      setDimensions({ width, height })
      canvas.width = width
      canvas.height = height
    })

    resizeObserver.observe(canvas.parentElement as Element)
    return () => resizeObserver.disconnect()
  }, [])

  useEffect(() => {
    if (!dimensions.width || !dimensions.height) return

    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return
    const context = ctx

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    const dots = generateDots(dimensions.width, dimensions.height)
    const duration = 3
    const resetAfter = 16

    function drawDots(c: CanvasRenderingContext2D) {
      c.clearRect(0, 0, dimensions.width, dimensions.height)
      dots.forEach((dot) => {
        c.beginPath()
        c.arc(dot.x, dot.y, dot.radius, 0, Math.PI * 2)
        c.fillStyle = `rgba(${DOT_COLOR}, ${dot.opacity})`
        c.fill()
      })
    }

    function drawRoute(
      c: CanvasRenderingContext2D,
      route: Route,
      startPoint: RoutePoint,
      progress: number
    ) {
      const x = startPoint.x + (route.end.x - startPoint.x) * progress
      const y = startPoint.y + (route.end.y - startPoint.y) * progress

      c.beginPath()
      c.moveTo(startPoint.x, startPoint.y)
      c.lineTo(x, y)
      c.strokeStyle = ROUTE_COLOR
      c.lineWidth = 1.5
      c.stroke()

      c.beginPath()
      c.arc(startPoint.x, startPoint.y, 3, 0, Math.PI * 2)
      c.fillStyle = ROUTE_COLOR
      c.fill()

      c.beginPath()
      c.arc(x, y, 6, 0, Math.PI * 2)
      c.fillStyle = "rgba(34, 201, 141, 0.35)"
      c.fill()

      c.beginPath()
      c.arc(x, y, 3, 0, Math.PI * 2)
      c.fillStyle = ROUTE_COLOR
      c.fill()

      if (progress >= 1) {
        c.beginPath()
        c.arc(route.end.x, route.end.y, 3, 0, Math.PI * 2)
        c.fillStyle = ROUTE_COLOR
        c.fill()
      }
    }

    if (reduced) {
      drawDots(context)
      ROUTES.forEach((route) => drawRoute(context, route, route.start, 1))
      return
    }

    let animationFrameId: number
    let startTime = Date.now()

    function animate() {
      const currentTime = (Date.now() - startTime) / 1000

      drawDots(context)

      ROUTES.forEach((route) => {
        const elapsed = currentTime - route.start.delay
        if (elapsed <= 0) return
        drawRoute(context, route, route.start, Math.min(elapsed / duration, 1))
      })

      if (currentTime > resetAfter) {
        startTime = Date.now()
      }

      animationFrameId = requestAnimationFrame(animate)
    }

    animate()

    return () => cancelAnimationFrame(animationFrameId)
  }, [dimensions])

  return (
    <div className="absolute inset-0 overflow-hidden" aria-hidden>
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
    </div>
  )
}

function WorkflowList() {
  return (
    <ol className="space-y-6">
      {WORKFLOW.map((step, i) => (
        <li key={step.label} className="relative flex gap-4">
          {i < WORKFLOW.length - 1 && (
            <span
              className="absolute bottom-[-22px] left-[15px] top-9 w-px bg-border-soft"
              aria-hidden
            />
          )}
          <div className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border bg-panel-alt">
            <step.icon className="size-4 text-emerald" />
          </div>
          <div className="flex min-w-0 items-start justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-foreground">{step.label}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{step.desc}</p>
            </div>
            <span className={cn(step.pill, "mt-0.5")}>{step.status}</span>
          </div>
        </li>
      ))}
    </ol>
  )
}

export default function LoginPage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (submitting) return
    setError(null)
    setSubmitting(true)
    const form = new FormData(e.currentTarget)
    try {
      const res = await signIn("credentials", {
        username: form.get("username"),
        password: form.get("password"),
        redirect: false,
      })
      if (res?.error) {
        setError("Username atau password salah")
        setSubmitting(false)
        return
      }
      router.push("/")
    } catch {
      setError("Terjadi kesalahan koneksi. Silakan coba lagi.")
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-[100dvh] items-center justify-center px-4 py-10 sm:px-6 lg:px-8">
      <div className="w-full max-w-4xl animate-fade-up overflow-hidden rounded-2xl border border-border bg-card shadow-[0_24px_80px_-24px_rgba(0,0,0,0.7)]">
        <div className="grid lg:grid-cols-2">
          <aside className="relative hidden overflow-hidden border-r border-border bg-panel lg:flex lg:flex-col lg:p-8 lg:min-h-[600px]">
            <div className="pointer-events-none absolute inset-0" aria-hidden>
              <DotMap />
              <div className="absolute inset-0 bg-gradient-to-br from-panel-alt/30 via-panel/60 to-panel-alt/40" />
              <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-emerald/10 blur-[110px]" />
              <div className="absolute -bottom-32 -right-24 h-72 w-72 rounded-full bg-blue/10 blur-[110px]" />
            </div>

            <div className="relative flex h-full flex-col">
              <BrandMark size="lg" />

              <div className="mt-14 text-center">
                <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald to-emerald/60 text-primary-foreground shadow-lg shadow-emerald/20">
                  <ArrowRight className="size-5" />
                </div>
                <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
                  TobakOS
                </h1>
                <p className="mx-auto mt-2 max-w-[34ch] text-sm leading-relaxed text-muted-foreground">
                  Digitalisasi pembelian tembakau — dari grading hingga pembayaran, dalam satu alur.
                </p>
              </div>

              <div className="mt-10">
                <p className="mb-4 font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-emerald">
                  Alur Kerja
                </p>
                <WorkflowList />
              </div>

              <div className="mt-auto border-t border-border-soft pt-5">
                <p className="font-mono text-[11px] tracking-wide text-muted-2">
                  <span className="text-emerald">{"//"}</span> alur: grading → penimbangan → lunas
                </p>
              </div>
            </div>
          </aside>

          <main className="flex flex-col justify-center px-6 py-10 sm:px-10 lg:px-12">
            <div className="mb-8 lg:hidden">
              <BrandMark size="lg" />
            </div>

            <div className="mb-8">
              <div className="flex items-center gap-2">
                <LockKeyhole className="size-3.5 text-emerald" />
                <span className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-emerald">
                  Sistem Internal
                </span>
              </div>
              <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-foreground">
                Masuk ke akun Anda
              </h2>
              <p className="mt-1.5 text-sm text-muted-foreground">
                Silakan masukkan akun Anda untuk mengakses sistem.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <label
                  htmlFor="username"
                  className="block text-[13px] font-semibold text-foreground"
                >
                  Username
                </label>
                <div className="relative">
                  <User className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-2" />
                  <input
                    id="username"
                    name="username"
                    type="text"
                    required
                    autoFocus
                    autoComplete="username"
                    className="w-full rounded-lg border border-border bg-input py-2.5 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-emerald focus:outline-none focus:ring-2 focus:ring-emerald/25"
                    placeholder="Masukkan username"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="password"
                  className="block text-[13px] font-semibold text-foreground"
                >
                  Password
                </label>
                <div className="relative">
                  <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-2" />
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    required
                    autoComplete="current-password"
                    className="w-full rounded-lg border border-border bg-input py-2.5 pl-9 pr-10 text-sm text-foreground placeholder:text-muted-foreground focus:border-emerald focus:outline-none focus:ring-2 focus:ring-emerald/25"
                    placeholder="Masukkan password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                    aria-pressed={showPassword}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted-2 transition-colors hover:bg-muted hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <div
                  role="alert"
                  aria-live="polite"
                  className="flex items-start gap-2.5 rounded-lg border border-red-deduction/40 bg-red-deduction/10 px-3.5 py-3 text-[13px] font-medium text-red-deduction"
                >
                  <AlertCircle className="mt-0.5 size-4 shrink-0" />
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="group flex w-full items-center justify-center gap-2 rounded-lg bg-emerald py-3 text-sm font-bold text-primary-foreground transition-all hover:bg-emerald/90 active:translate-y-px disabled:pointer-events-none disabled:opacity-60"
              >
                {submitting ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : (
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                )}
                {submitting ? "Memproses..." : "Masuk"}
              </button>
            </form>

            <p className="mt-8 text-center font-mono text-[11px] text-muted-2">
              Sistem Input Pembelian Tembakau · v0.1
            </p>
          </main>
        </div>
      </div>
    </div>
  )
}
