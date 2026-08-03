# Panduan Deploy Lokal TobakOS

Panduan ini mencakup 3 hal untuk penggunaan produksi di jaringan lokal (LAN):
1. **HTTPS + pemasangan sertifikat di tablet** (wajib — WebSerial timbangan, kamera scan, dan printer thermal **tidak berfungsi** tanpa HTTPS)
2. **Backup database MariaDB otomatis**
3. **Deploy & auto-start server dengan PM2**

> Prasyarat umum: Windows Server/PC sebagai host, Node.js ≥ 20.9, MariaDB/MySQL berjalan, repo TobakOS sudah ter-clone (mis. `C:\tobak-os\tobak-os`), file `.env` sudah terisi (`DATABASE_URL`, `AUTH_SECRET`, `AUTH_URL`).

---

## 1. HTTPS + Sertifikat Tablet

### Mengapa wajib
WebSerial (timbangan USB), `getUserMedia` (kamera scan barcode), dan WebSocket printer **hanya diizinkan browser di secure context**: `https://` atau `localhost`. Akses `http://192.168.x.x:3000` membuat fitur-fitur itu diam-diam tidak berfungsi.

> **Catatan penting:** WebSerial hanya didukung **Chrome/Edge desktop (Windows)**. Tablet Android tidak mendukung WebSerial — jika tablet Anda Android, timbangan hanya bisa input manual; kamera tetap jalan di Android (HTTPS tetap wajib).

### Langkah 1 — Generate sertifikat dengan mkcert (di server)

1. Install **mkcert** (Windows):
   ```powershell
   choco install mkcert   # atau: winget install FiloSottile.mkcert
   ```
2. Buat CA lokal (sekali saja):
   ```powershell
   mkcert -install
   ```
3. Generate sertifikat untuk IP server (ganti `192.168.1.10` dengan IP tetap server):
   ```powershell
   New-Item -ItemType Directory -Path "C:\tobak-os\certs" -Force
   cd C:\tobak-os\certs
   mkcert 192.168.1.10 localhost
   ```
   Hasil: `192.168.1.10+1.pem` (sertifikat) dan `192.168.1.10+1-key.pem` (kunci).
4. Simpan salinan CA root untuk dipasang di tablet (lokasi ditampilkan mkcert saat `-install`, biasanya `C:\Users\<user>\AppData\Local\mkcert\rootCA.pem`):
   ```powershell
   Copy-Item "$env:LOCALAPPDATA\mkcert\rootCA.pem" C:\tobak-os\certs\rootCA.pem
   ```

### Langkah 2 — Jalankan Next.js dengan HTTPS

Buat `server.js` di root proyek (`C:\tobak-os\tobak-os\server.js`):

```js
const https = require("https")
const fs = require("fs")
const path = require("path")
require("dotenv").config()
const next = require("next")

const dev = process.env.NODE_ENV !== "production"
const app = next({ dev })
const handle = app.getRequestHandler()
const port = Number(process.env.HTTPS_PORT || 3443)

app.prepare().then(() => {
  https
    .createServer(
      {
        key: fs.readFileSync(path.join(__dirname, process.env.HTTPS_KEY || "certs/192.168.1.10+1-key.pem")),
        cert: fs.readFileSync(path.join(__dirname, process.env.HTTPS_CERT || "certs/192.168.1.10+1.pem")),
      },
      (req, res) => handle(req, res)
    )
    .listen(port, "0.0.0.0", () => {
      console.log(`TobakOS ready on https://0.0.0.0:${port}`)
    })
})
```

Tambahkan ke `package.json` (scripts):
```json
"start:https": "NODE_ENV=production node server.js"
```
> `NODE_ENV=production` di PowerShell bisa gagal — pakai cara PM2 di Bagian 3 (env diset di ecosystem), atau `$env:NODE_ENV="production"; node server.js`.

Sesuaikan `.env`:
```env
AUTH_URL=https://192.168.1.10:3443
NEXTAUTH_URL=https://192.168.1.10:3443
HTTPS_PORT=3443
HTTPS_CERT=certs/192.168.1.10+1.pem
HTTPS_KEY=certs/192.168.1.10+1-key.pem
```

### Langkah 3 — Buka firewall
```powershell
New-NetFirewallRule -DisplayName "TobakOS HTTPS" -Direction Inbound -Protocol TCP -LocalPort 3443 -Action Allow
```

### Langkah 4 — Pasang sertifikat CA di tablet
- **Tablet Windows:** klik ganda `rootCA.pem` → *Install Certificate* → *Local Machine* → *Trusted Root Certification Authorities* → selesai. (Atau via `certmgr.msc` → Trusted Root → Import.)
- **Tablet Android:** salin `rootCA.pem` ke tablet → *Settings → Security & privacy → More security settings → Install from storage → CA certificate* → pilih file → restart browser.

### Langkah 5 — Verifikasi
1. Buka `https://192.168.1.10:3443` di tablet — gembok hijau, tanpa peringatan.
2. Login, buka Pos 2 → tombol Hubungkan Timbangan aktif, kamera scan berfungsi.
3. Cetak stiker thermal masih normal.

> **Tips:** gunakan satu IP statis untuk server (setting di router/DHCP reservation) — jangan ubah-ubah IP, karena sertifikat dibuat per-IP dan cookie login (AUTH_URL) mengikuti host yang dipakai.

---

## 2. Backup Database MariaDB Otomatis

### Langkah 1 — Buat skrip backup
Simpan sebagai `C:\tobak-os\backup-db.ps1`:

```powershell
param(
  [string]$DbUser   = "root",
  [string]$DbPass   = "",
  [string]$DbName   = "tobakos",
  [string]$BackupDir = "C:\tobak-backup",
  [int]$RetentionDays = 14
)

$mysqldump = "C:\Program Files\MariaDB 11.x\bin\mysqldump.exe"  # sesuaikan path instalasi
New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null

$stamp = Get-Date -Format "yyyyMMdd_HHmmss"
$file  = Join-Path $BackupDir "$DbName`_$stamp.sql"

$passArg = if ($DbPass) { "-p$DbPass" } else { "" }
& $mysqldump -u $DbUser $passArg --single-transaction --routines --triggers --databases $DbName --result-file=$file

if ($LASTEXITCODE -ne 0) {
  Write-Error "Backup GAGAL — cek kredensial/path mysqldump"
  exit 1
}

# Simpan salinan .env sebagai cadangan konfigurasi (jangan lindungi dengan ACL)
Copy-Item "C:\tobak-os\tobak-os\.env" "$BackupDir\.env.backup" -Force

# Hapus backup lebih lama dari RetentionDays
Get-ChildItem $BackupDir -Filter "*.sql" |
  Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-$RetentionDays) } |
  Remove-Item -Force

Write-Output "Backup OK: $file"
```

### Langkah 2 — Jadwalkan harian (Task Scheduler)
```powershell
schtasks /create /tn "TobakOS Backup DB" /tr "powershell.exe -NoProfile -ExecutionPolicy Bypass -File C:\tobak-os\backup-db.ps1" /sc daily /st 02:00 /ru SYSTEM /rl HIGHEST /f
```
Uji jalankan manual dulu:
```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File C:\tobak-os\backup-db.ps1
```

### Langkah 3 — Prosedur restore (darurat)
```powershell
# Jalur CMD (agar < redirection jalan):
cmd /c "mysql -u root -p tobakos < C:\tobak-backup\tobakos_20260803_020000.sql"
```

### Praktik yang disarankan
- Salin folder `C:\tobak-backup` ke media lain (flashdisk/PC kedua) seminggu sekali.
- Sekali sebulan, lakukan **uji restore** ke DB test untuk memastikan backup benar.
- Jika server sering mati lampu, pasang UPS — database korup saat listrik mati lebih sulit diperbaiki daripada backup.

---

## 3. Deploy & Auto-start dengan PM2

### Langkah 1 — Install PM2
```powershell
npm install -g pm2
npm install -g pm2-windows-startup   # agar auto-start saat Windows boot
```

### Langkah 2 — Buat ecosystem config
Simpan sebagai `C:\tobak-os\tobak-os\ecosystem.config.js`:

```js
module.exports = {
  apps: [
    {
      name: "tobak-os",
      script: "server.js",                 // HTTPS (Bagian 1); ganti ke bawah untuk HTTP
      cwd: "C:\\tobak-os\\tobak-os",
      instances: 1,
      autorestart: true,
      max_memory_restart: "512M",
      env: {
        NODE_ENV: "production",
        HTTPS_PORT: "3443",
        // HTTPS_CERT / HTTPS_KEY otomatis terbaca dari .env
      },
      // HTTP biasa (tanpa HTTPS): comment baris di atas, aktifkan ini:
      // script: "node_modules/next/dist/bin/next",
      // args: "start -H 0.0.0.0 -p 3000",
    },
  ],
}
```

### Langkah 3 — Jalankan
```powershell
pm2 start ecosystem.config.js
pm2 save                 # simpan daftar proses
pm2-startup install      # daftarkan sebagai service Windows (jalankan sebagai Admin)
```

### Langkah 4 — Perintah harian
```powershell
pm2 status               # cek status
pm2 logs tobak-os --lines 100   # lihat log
pm2 restart tobak-os     # restart manual
pm2 monit                # pantau CPU/memori
```

### Langkah 5 — Alur update aplikasi
```powershell
cd C:\tobak-os\tobak-os
git pull
npm ci
npx prisma migrate deploy
npm run build
pm2 reload tobak-os
```

### Deploy dari awal (server baru) — ringkasan
```powershell
# 1. Install Node LTS + MariaDB, clone repo, isi .env
git clone <repo> C:\tobak-os\tobak-os
# 2. Dependensi & database
npm ci
npx prisma migrate deploy
npm run seed              # data awal (warehouse, jalur, customer default, user)
# 3. Sertifikat HTTPS (Bagian 1)
# 4. PM2 (Bagian 3)
pm2 start ecosystem.config.js
pm2 save
```

---

## Checklist Go-Live
- [ ] Akses `https://<IP>:3443` dari tablet → gembok hijau, tanpa warning
- [ ] Timbangan terhubung (Pos 2), kamera scan jalan, stiker thermal tercetak
- [ ] Backup otomatis berjalan: cek file muncul di `C:\tobak-backup` setelah jam 02:00
- [ ] Restart Windows → aplikasi menyala sendiri (PM2)
- [ ] `AUTH_URL`/`NEXTAUTH_URL` di `.env` sudah alamat HTTPS
- [ ] Uji restore backup ke DB test (sekali sebelum go-live)
