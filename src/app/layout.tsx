import type { Metadata, Viewport } from "next"
import { Inter, JetBrains_Mono } from "next/font/google"
import "./globals.css"
import { Toaster } from "@/components/ui/sonner"
import { ThemeProvider } from "@/components/theme-provider"
import { SerwistProvider } from "@serwist/turbopack/react"
import { PwaUpdater } from "@/components/pwa-updater"

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
})

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
})

const APP_NAME = "TobakOS — Pos 1 Grading"

export const metadata: Metadata = {
  title: "TobakOS — Sistem Input Pembelian Tembakau",
  description: "Digitalisasi proses grading & penimbangan tembakau",
  applicationName: APP_NAME,
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "TobakOS Pos 1",
  },
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/icon-512.png",
  },
  formatDetection: {
    telephone: false,
  },
}

export const viewport: Viewport = {
  themeColor: "#060A12",
  viewportFit: "cover",
  width: "device-width",
  initialScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="id"
      className={`${inter.variable} ${jetbrainsMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
<head>
    <meta name="interactive-widget" content="resizes-content" />
    <link rel="manifest" href="/manifest.webmanifest" />
  </head>
      <body className="min-h-full bg-background text-foreground">
        <SerwistProvider swUrl="/serwist/sw.js">
          <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem={false}
            disableTransitionOnChange
          >
            {children}
            <Toaster richColors closeButton />
            <PwaUpdater />
          </ThemeProvider>
        </SerwistProvider>
      </body>
    </html>
  )
}