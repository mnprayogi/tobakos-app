import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/pos-1/grading",
    name: "TobakOS — Pos 1 Grading",
    short_name: "TobakOS Pos 1",
    description: "Sistem input pembelian tembakau — Pos 1 Grading",
    start_url: "/pos-1/grading",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#060A12",
    theme_color: "#060A12",
    categories: ["business", "productivity"],
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "Pos 1 · Grading",
        short_name: "Grading",
        description: "Input & cetak bale di Pos 1",
        url: "/pos-1/grading",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
      },
    ],
  };
}