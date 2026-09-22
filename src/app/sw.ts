/// <reference lib="esnext" />
/// <reference lib="webworker" />
import { defaultCache } from "@serwist/turbopack/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { ExpirationPlugin, NetworkFirst, NetworkOnly, Serwist } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const runtimeCaching = [
  {
    matcher: ({ request, sameOrigin }: { request: Request; sameOrigin: boolean }) =>
      sameOrigin && request.mode === "navigate" && request.method === "GET",
    handler: new NetworkFirst({
      cacheName: "navigations",
      networkTimeoutSeconds: 8,
      plugins: [new ExpirationPlugin({ maxEntries: 64, maxAgeSeconds: 86_400 })],
    }),
  },
  {
    matcher: ({ request, sameOrigin }: { request: Request; sameOrigin: boolean }) =>
      sameOrigin && request.method === "POST",
    handler: new NetworkOnly(),
  },
  {
    matcher: ({ url, sameOrigin }: { url: URL; sameOrigin: boolean }) =>
      sameOrigin && url.pathname.startsWith("/api/"),
    handler: new NetworkOnly(),
  },
  ...defaultCache,
];

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching,
  fallbacks: {
    entries: [
      {
        url: "/~offline",
        matcher({ request }) {
          return request.destination === "document";
        },
      },
    ],
  },
});

serwist.addEventListeners();