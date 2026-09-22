import type { NextConfig } from "next";
import { withSerwist } from "@serwist/turbopack";

const isProd = process.env.NODE_ENV === "production";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.100.111"],
  experimental: { serverActions: { bodySizeLimit: "4mb" } },
  // Prisma driver adapter + mariadb wajib dimuat dari node_modules asli.
  // Jika di-bundle Turbopack, koneksi driver menggantung (pool timeout
  // active=0 idle=0) padahal DB sehat — @prisma/client sudah di-default
  // external oleh Next, tapi mariadb & adapter tidak.
  serverExternalPackages: ["mariadb", "@prisma/adapter-mariadb"],
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob:",
              "font-src 'self' data:",
              "connect-src 'self' ws: wss:",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "frame-ancestors 'none'",
              "worker-src 'self' blob:",
            ].join("; "),
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(self), serial=(self), geolocation=()",
          },
          ...(isProd
            ? [
                {
                  key: "Strict-Transport-Security",
                  value: "max-age=31536000; includeSubDomains",
                },
              ]
            : []),
        ],
      },
    ];
  },
};

export default withSerwist(nextConfig);