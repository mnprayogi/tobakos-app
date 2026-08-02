"use client"

import { signIn } from "next-auth/react"
import { useState } from "react"
import { useRouter } from "next/navigation"

export default function LoginPage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const form = new FormData(e.currentTarget)
    const res = await signIn("credentials", {
      username: form.get("username"),
      password: form.get("password"),
      redirect: false,
    })
    if (res?.error) {
      setError("Username atau password salah")
    } else {
      router.push("/")
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-sm space-y-6 rounded-xl border border-border bg-card p-8">
        <div className="text-center">
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
            TobakOS
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Sistem Input Pembelian Tembakau
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="username" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Username
            </label>
            <input
              id="username"
              name="username"
              type="text"
              required
              className="w-full rounded-lg border border-border bg-input px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-emerald focus:ring-2 focus:ring-emerald/20 focus:outline-none"
              placeholder="Masukkan username"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              className="w-full rounded-lg border border-border bg-input px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-emerald focus:ring-2 focus:ring-emerald/20 focus:outline-none"
              placeholder="Masukkan password"
            />
          </div>

          {error && (
            <p className="text-xs font-medium text-red-deduction">{error}</p>
          )}

          <button
            type="submit"
            className="w-full rounded-lg bg-emerald px-4 py-2.5 font-bold text-primary-foreground transition-colors hover:bg-emerald/90"
          >
            Masuk
          </button>
        </form>
      </div>
    </div>
  )
}
