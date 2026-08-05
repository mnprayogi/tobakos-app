// Fallback polling — SSE adalah sumber utama update real-time.
// Interval ini berfungsi sebagai jaring pengaman saat koneksi SSE putus
// atau event terlewat (mis. server restart).
export const REALTIME_INTERVAL_MS = 10_000
