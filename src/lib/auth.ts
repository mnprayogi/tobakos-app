import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/db"

// Hash bcrypt dummy untuk menormalkan durasi saat user tidak ditemukan
// (mencegah user enumeration via timing attack).
const DUMMY_HASH = "$2b$12$DP0JNt6wBO3X8cOUJFUFG.FypOfak6HCAlfAc8XgpojQzABB87CD2"

export const { handlers, signIn, signOut, auth } = NextAuth({
  // Di Vercel, host di-trust otomatis (env VERCEL). Di tempat lain aktifkan
  // eksplisit via AUTH_TRUST_HOST — jangan pakai `true` mentah (host poisoning).
  trustHost: process.env.VERCEL === "1" || process.env.AUTH_TRUST_HOST === "true",
  secret: process.env.AUTH_SECRET,
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) return null
        const passwordInput = credentials.password as string
        const user = await prisma.user.findUnique({
          where: { username: credentials.username as string },
        })
        if (!user) {
          // Normalisasi timing: tetap lakukan bcrypt walau user tidak ada,
          // agar durasi tidak membedakan user valid vs tidak valid.
          await bcrypt.compare(passwordInput, DUMMY_HASH)
          return null
        }
        const isValid = await bcrypt.compare(
          passwordInput,
          user.password ?? ""
        )
        if (!isValid) return null
        return {
          id: String(user.id),
          name: user.name,
          email: user.email,
          role: user.role,
        }
      },
    }),
  ],
  callbacks: {
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub!
        session.user.role = token.role as string
      }
      return session
    },
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role
      }
      return token
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 8,
    updateAge: 60 * 60,
  },
  cookies: {
    sessionToken: {
      options: {
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
})
