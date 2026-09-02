# Panduan Deployment TobakOS — Vercel (Gratis)

Panduan ini untuk orang yang **belum pernah deploy aplikasi**. Ikuti urutan fase dari atas ke bawah. Semua biaya **Rp 0** (selama dalam batas free tier).

---

## Ringkasan: Apa yang akan kita buat?

```
[Tablet / HP kamu]  ── HTTPS ──▶  [Vercel]          [Aiven]
   (Chrome, PWA)                 (menjalankan      (database MySQL
                                  aplikasi TobakOS   di cloud, gratis)
                                  di cloud, gratis)
```

- **Vercel** = penyedia hosting. Dia yang menjalankan aplikasi Next.js kamu di internet. Free tier-nya tidak butuh kartu kredit.
- **Aiven** = penyedia database. Dia yang menyimpan data MySQL kamu di cloud (region Singapore supaya cepat dari Indonesia). Free tier-nya tidak butuh kartu kredit.
- Setelah selesai, aplikasi bisa dibuka dari **mana saja lewat browser/tablet**, tidak lagi tergantung PC gudang.

### Istilah penting (baca sekali, akan dipakai di bawah)

| Istilah | Arti sederhana |
|---|---|
| **Repository / repo** | Folder project kamu di GitHub (`mnprayogi/tobakos-app`) |
| **Commit & push** | Menyimpan perubahan ke GitHub. Vercel otomatis membaca setiap push → langsung build versi baru |
| **Build** | Proses mengubah kode jadi versi siap jalan di server |
| **Environment Variable (env var)** | Nilai rahasia/konfigurasi yang disimpan di server, bukan di kode — contoh: password database |
| **Migration** | "Cetak biru" struktur tabel database, dikelola Prisma |
| **Seed** | Skrip pengisi data awal (user login, jenis tembakau, gudang, dll) |
| **SSL/HTTPS** | Enkripsi koneksi; **wajib** agar fitur WebSerial (timbangan) & PWA bisa jalan |
| **URI** | Satu string berisi alamat + user + password database |

---

## Prasyarat

Sebelum mulai, pastikan semua ini ada:

1. [x] Kode project sudah di GitHub (repo `mnprayogi/tobakos-app`, branch `main`) — **sudah, kita push tadi**
2. [ ] Akun **GitHub** (untuk login ke Vercel)
3. [ ] Email aktif (untuk daftar Aiven & Vercel)
4. [ ] PC/laptop dengan project ini + koneksi internet (XAMPP boleh nyala, untuk Fase 2)
5. [ ] Opsional: `git` terinstall — kalau sudah pernah commit pasti sudah ada

---

## Fase 0 — Persiapan di PC (5 menit)

**0.1** Buka folder project di **PowerShell** (klik kanan folder → "Open in Terminal", atau `cd C:\tobak-os\tobak-os`).

**0.2** Pastikan kode terbaru sudah di GitHub:

```powershell
git status
git log --oneline -3
```

Harus terlihat 3 commit terakhir kita, contoh:
```
6564725 build: postinstall prisma generate agar build di Vercel berhasil
757d3d4 refactor: event bus in-memory ke DB polling (app_events) - siap multi-instance/serverless
9f4ad37 fix: dialog tertutup keyboard di tablet/hp - meta interactive-widget + visualViewport
```

**0.3** Pastikan build lokal masih sukses (kalau error di sini, error di Vercel juga):

```powershell
npm run build
```

Harus berakhir dengan `✓ Compiled successfully` tanpa error.

> **Catatan**: selama panduan ini, jangan tutup window PowerShell ini — kita pakai lagi di Fase 2.

---

## Fase 1 — Buat Database di Aiven (15 menit)

### 1.1 Daftar akun Aiven

1. Buka **https://aiven.io** di browser
2. Klik **"Sign up"** (pojok kanan atas)
3. Pilih **Sign up with Google** (paling cepat) atau isi email + password
4. Cek email → klik link verifikasi
5. Setelah masuk, kamu akan melihat banner *"Trial is active... $50 credits"* — **abaikan**, itu untuk layanan berbayar; kita pakai plan **Free** yang gratis selamanya

### 1.2 Buat database MySQL

1. Klik tombol **"Create a new service"** (biasanya di halaman *Services*)
2. Pilih **"Aiven for MySQL"**
3. Konfigurasi:
   - **Plan**: pilih **"Free"** (gratis selamanya, bukan Startup/Business!)
   - **Cloud Provider**: **AWS**
   - **Cloud Region**: **Singapore** (`aws-ap-southeast-1`) — penting: region terdekat ke Indonesia = paling cepat
   - **Service Name**: ketik `tobak-os-db`
4. Klik **"Create service"** — tunggu 1–3 menit sampai status berubah dari *RUNNING* (oranye/abu) ke **RUNNING (hijau)**

### 1.3 Ambil password & alamat database

1. Klik service `tobak-os-db` untuk masuk ke halamannya
2. Menu kiri → **"Service management"** → cari **"Reset password"** (di bawah *Service user information*):
   - Ini men-generate password acak — **salin & simpan di Notepad** (kita pakai beberapa kali, dan URL tidak menyimpannya setelah halaman ditutup)
3. Menu kiri → **"Overview"** → lihat bagian **"Connection information"** → tab **"URI"**
   - Akan muncul string seperti ini (ini hanya contoh):
     ```
     mysql://avnadmin:ABcDe123fGhIjkl@tobak-os-db-project-8f2a3.a.aivencloud.com:12034/defaultdb?ssl-mode=REQUIRED
     ```
   - Bagian-bagiannya: `avnadmin` = username, `ABcDe123...` = password, `tobak-os-db-....aivencloud.com` = host, `12034` = port, `defaultdb` = nama database
4. **Simpan URI lengkap ini di Notepad**, lalu **ganti passwordnya** dengan password dari langkah 2:
   ```
   mysql://avnadmin:<PASSWORD BARU DARI LANGKAH 2>@tobak-os-db-project-8f2a3.a.aivencloud.com:12034/defaultdb?ssl-mode=REQUIRED
   ```
   → Kita sebut ini **`URI CLOUD`** di fase selanjutnya.

> **Penting soal password**: password Aiven hanya berisi huruf & angka (aman untuk URL). Kalau nanti password mengandung karakter `@` atau `:` — hubungi saya, perlu di-encode.

---

## Fase 2 — Isi Database Cloud (10 menit)

Sekarang database kosong. Kita (a) buat struktur tabel lewat migrasi Prisma, lalu (b) pilih: mulai bersih (seed) atau bawa data lama.

### 2.1 Terapkan struktur tabel (migration)

Kembali ke **PowerShell** (window dari Fase 0). Set environment variable ke database cloud — **ganti `<URI CLOUD>` dengan URL milikmu**:

```powershell
$env:DATABASE_URL = "mysql://avnadmin:<PASSWORD>@tobak-os-db-project-8f2a3.a.aivencloud.com:12034/defaultdb?ssl-mode=REQUIRED"
```

Cek tidak salah ketik (harus tampil URL cloud, bukan `localhost`):

```powershell
echo $env:DATABASE_URL
```

Jalankan migrasi:

```powershell
npx prisma migrate deploy
```

Output yang benar (contoh):
```
Prisma schema loaded ...
Datasource "db": MySQL database "defaultdb" at "tobak-os-db-project-....aivencloud.com:12034"
```
diakhiri dengan semua migrasi **applied**. Kalau muncul error koneksi → lihat bagian Troubleshooting #2.

### 2.2 Pilih jalur data

#### Jalur A — Mulai bersih (untuk uji coba)

Jalankan seed (membuat user login, gudang, jalur, jenis tembakau, grade, customer "Gudang Sendiri"). **Window PowerShell yang sama**, karena `$env:DATABASE_URL` masih menunjuk ke cloud:

```powershell
npm run seed
```

Output terakhir: `Seed completed!` — berhasil.

> **Password login**: seed membuat password **acak per user** dan mencetaknya ke console (format `User admin dibuat — PASSWORD: <acak>`). Simpan nilai ini. Menjalankan seed ulang **tidak** me-reset password user yang sudah ada.

#### Jalur B — Bawa data produksi (termasuk transaksi lama)

Jalankan seed dulu (seperti Jalur A), LALU dump data dari DB lokal dan restore ke cloud:

```powershell
# 1) Dump DATA dari database lokal (hanya data, tanpa struktur tabel)
& "C:\xampp\mysql\bin\mysqldump.exe" -u root --no-create-info --skip-triggers --default-character-set=utf8mb4 tobak_os > dump.sql

# 2) Restore ke database cloud
$env:MYSQL_PWD = "<PASSWORD>"   # password Aiven
Get-Content -Raw dump.sql | & "C:\xampp\mysql\bin\mysql.exe" -h tobak-os-db-project-8f2a3.a.aivencloud.com -P 12034 -u avnadmin --ssl --init-command="SET FOREIGN_KEY_CHECKS=0" defaultdb
```

Tidak ada output = sukses (di Windows perintah restore diam). Kalau muncul error → Troubleshooting #3.

> **Perhatian**: setelah migrasi data, transaksi lama akan tampil di cloud. Data lokal di XAMPP **tidak hilang** — keduanya jalan paralel.

### 2.3 Kembalikan PowerShell ke pengaturan normal

Tutup window PowerShell, atau ketik:

```powershell
Remove-Item Env:DATABASE_URL
Remove-Item Env:MYSQL_PWD
```

Supaya perintah lokal berikutnya tidak salah arah ke cloud.

---

## Fase 3 — Deploy ke Vercel (15 menit)

### 3.1 Daftar & hubungkan GitHub

1. Buka **https://vercel.com** → **"Sign Up"** → **"Continue with GitHub"** → ikuti instruksi otorisasi (grant akses ke repo `mnprayogi/tobakos-app`)
2. Setelah masuk, klik **"Add New..."** → **"Project"**

### 3.2 Import project

1. Di daftar repositori, klik **`tobakos-app`**
2. Halaman *"Configure Project"*:
   - **Framework Preset**: biarkan **Next.js** (otomatis terdeteksi)
   - **Root Directory**: biarkan kosong (`/`)
   - **Build Command / Output**: biarkan kosong (default `next build`)
3. Klik **"Deploy"** → tunggu build ~2–4 menit (log bergulir: install → postinstall `prisma generate` → `next build`)
4. Selesai → muncul layar *"Congratulations"* dengan URL seperti **`https://tobakos-app-xxxx.vercel.app`** — klik URL-nya

### 3.3 Set Environment Variables (kritis)

Tanpa ini aplikasi tidak bisa terhubung ke database. Di dashboard project:

1. Menu **Settings** → **Environment Variables**
2. Tambahkan satu per satu (klik **Add New** → isi **Key** & **Value** → **Save**):

   | Key | Value |
   |---|---|
   | `DATABASE_URL` | `URI CLOUD` milikmu (lengkap dengan `?ssl-mode=REQUIRED` di akhir) |
   | `AUTH_SECRET` | Kunci rahasia — buat di PC dengan perintah di bawah |
   | `TZ` | `Asia/Jakarta` |
   | `AUTH_TRUST_HOST` | `true` |

   Buat `AUTH_SECRET` di PowerShell (boleh window baru):

   ```powershell
   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
   ```

   Salin hasilnya (sekali muncul, simpan — nilai ini rahasia; siapa pun yang punya bisa memalsukan login).

3. Environment variables **tidak langsung aktif** untuk build lama → klik **"Redeploy"**:
   - Menu **Deployments** → klik titik tiga (⋯) pada deployment paling atas → **"Redeploy"** → centang *"Use existing Build Cache"* → **Redeploy**
4. Tunggu build selesai lagi (~2–4 menit), lalu buka URL-nya.

### 3.4 (Opsional) Domain sendiri

Kalau mau domain seperti `app.namagudang.id`:

1. **Settings → Domains** → ketik domain → **Add**
2. Ikuti instruksi DNS yang ditampilkan (biasanya: di panel registrar domainmu, buat record `A` atau `CNAME` menunjuk ke `cname.vercel-dns.com`)
3. Setelah terverifikasi hijau, HTTPS otomatis aktif (Let's Encrypt)

---

## Fase 4 — Verifikasi (15 menit)

Buka URL aplikasi (mis. `https://tobakos-app-xxxx.vercel.app`) di browser. Cek satu per satu:

| # | Cek | Cara | Hasil benar |
|---|---|---|---|
| 1 | Login | Pakai username `admin` dan **password acak yang dicetak console saat seed** (lihat output `npm run seed` — format `PASSWORD: ...`) | Masuk ke dashboard |
| 2 | Pos 1 | Buka **Pos 1 → Grading**, tambah petani + bale | Bale tersimpan, label code tampil |
| 3 | Real-time | Buka **Pos 2 → Penimbangan** di tab/device lain, scan label code | Data grading muncul dari Pos 1 |
| 4 | Refresh real-time | Di Pos 1 buat 1 bale baru | Pos 2 otomatis update **≤ 1,5 detik** |
| 5 | Transaksi | Ikuti alur timbang → review → bayar | Perhitungan benar (sama seperti server lokal) |
| 6 | Tanggal WIB | Perhatikan `labelCode` & tanggal transaksi | Tanggal sesuai WIB (bukan UTC) |
| 7 | PWA | Buka di **Chrome tablet/HP** → menu ⋮ → **"Add to Home screen" / "Install"** | Muncul ikon app, terbuka mode standalone |
| 8 | Timbangan USB | Di tablet yang terhubung timbangan | WebSerial bekerja (butuh HTTPS — sudah terpenuhi) |

**Kalau #2–#5 bermasalah** → cek Fase 2 (migrasi/seed gagal?) dan Troubleshooting.

---

## Fase 5 — Operasional (penting!)

Free tier **tidak punya backup otomatis** — kalau data cloud hilang, hilang. Wajib rutin:

### 5.1 Backup mingguan (jalankan tiap minggu di PC gudang)

```powershell
$env:MYSQL_PWD = "<PASSWORD>"
& "C:\xampp\mysql\bin\mysqldump.exe" -h tobak-os-db-project-8f2a3.a.aivencloud.com -P 12034 -u avnadmin --ssl --default-character-set=utf8mb4 defaultdb > "backup-cloud-$((Get-Date).ToString('yyyyMMdd')).sql"
Remove-Item Env:MYSQL_PWD
```

File `.sql` muncul di folder — simpan (flashdisk/drive cloud). Backup juga file `.env` lokal.

### 5.2 Update aplikasi (setiap ada perubahan)

Setiap kali fitur baru selesai & sudah di-push ke GitHub (`git push origin main`), **Vercel otomatis build ulang** dalam 1–2 menit. Tidak perlu apa-apa — kecuali env var berubah (lihat 3.3).

### 5.3 Pantau batas gratis

- **Vercel Hobby**: 100 GB bandwidth/bulan, 100.000 pemanggilan fungsi/hari — untuk skala beberapa tablet tidak akan tersentuh
- **Aiven Free**: 5 GB storage. Cek di dashboard Aiven (menu Overview → Storage). Satu transaksi ≈ beberapa KB, jadi muat bertahun-tahun

### 5.4 Maintenance Aiven

Kadang Aiven me-restart service (maintenance). Efeknya: aplikasi sempat gagal konek 1–2 menit, lalu normal kembali (SSE auto-reconnect). Tidak perlu tindakan.

---

## Keamanan (Security Notes)

Ringkasan langkah keamanan yang sudah diterapkan, plus hal yang sengaja ditunda.

### Sudah diterapkan
- **Password ter-hash** (bcrypt, 12 rounds) saat user dibuat/diubah via admin; kolom `password` **tidak pernah dikirim ke browser** (dikecualikan dari semua query).
- **Role allowlist**: hanya role valid yang bisa ditetapkan. Hanya akun **SUPER_ADMIN** yang bisa membuat/mengatur user ber-role `ADMIN`/`SUPER_ADMIN`.
- **`/api/printer` & `/api/scale`** kini menolak akses tanpa login (401) dan validasi input.
- **Login anti-timing-attack**: durasi respons disamakan walau user tidak ditemukan.
- **Cookie sesi**: `sameSite=lax`, `secure` di produksi, umur sesi 8 jam.
- **SSE real-time di-scope**: GRADER/OPERATOR hanya menerima event bale jalurnya sendiri; FINANCE hanya event keuangan + bale gudangnya; CUSTOMER ditolak (403).
- **Security headers**: CSP, X-Frame-Options, nosniff, Referrer-Policy, HSTS (produksi), Permissions-Policy (kamera & serial).
- **`AUTH_SECRET`** harus nilai acak 32 byte (lihat 3.3). Jangan gunakan nilai contoh apa pun.

### Ditunda (risiko diterima untuk saat ini)
| Area | Risiko | Kompensasi / rencana |
|---|---|---|
| **Rate limiting login** | Brute-force online | Password minimal 8 karakter di-enforce. Rencana: tambah `@upstash/ratelimit` bila perlu |
| **Pemilihan jalur dinamis** (`?lane=`) | User tanpa lane dapat mengakses data jalur lain sesuai picker | Ini desain *shared tablet*. Jika ingin ketat: wajibkan lane di akun (ubah form user + seed) |
| **`prisma` downgrade** (`deepmerge-ts`/`mysql2` advisory) | DoS stack-exhaustion (server-only) | Tunggu patch Prisma ≥8; `npm audit fix --force` akan men-downgrade ke 6.x (jangan) |
| **Driver `mariadb`** (cleartext password via MitM) | **Tidak ada fix resmi** | PENTING: aktifkan **TLS wajib** di koneksi produksi (`?ssl-mode=REQUIRED` di `DATABASE_URL`) dan batasi IP yang bisa konek ke Aiven (allowlist IP Vercel) |

### Perintah audit
```bash
npm audit            # cek keamanan dependensi
```

---

## Troubleshooting

| # | Gejala | Penyebab & solusi |
|---|---|---|
| 1 | Build Vercel gagal | Buka tab **Deployments** → klik deployment merah → lihat log. Umumnya: (a) env var belum di-set → set lalu Redeploy (3.3); (b) syntax error — perbaiki di kode, commit, push |
| 2 | `prisma migrate deploy` error *connect ECONNREFUSED* | `$env:DATABASE_URL` salah/host salah/port salah — `echo $env:DATABASE_URL` dan bandingkan dengan URI Aiven. Pastikan service Aiven berstatus RUNNING |
| 3 | Restore data error *Access denied* / *password* | `$env:MYSQL_PWD` belum diset atau salah; pastikan di-set sebelum perintah `mysql.exe` (window PowerShell yang sama) |
| 4 | Restore data error *Unknown database* | Nama database salah — harus `defaultdb` |
| 5 | Login tidak bisa | Seed belum jalan (Fase 2.2) atau `AUTH_SECRET` berubah (JWT lama jadi invalid — normal, tinggal login ulang) |
| 6 | Pos 2 tidak update real-time | Refresh manual dulu. Kalau refresh manual jalan tapi real-time tidak: koneksi SSE putus — buka DevTools (F12) → tab Network → filter `events` → lihat status. Biasanya pulih sendiri (EventSource auto-reconnect + fallback polling) |
| 7 | Tanggal transaksi salah (beda hari) | Env var `TZ=Asia/Jakarta` belum diset → set (3.3) → Redeploy |
| 8 | Error *SSL* saat konek DB | Coba ganti `?ssl-mode=REQUIRED` → `?ssl=true` di `DATABASE_URL` (keduanya env var Aiven & PowerShell), lalu ulangi Fase 2.1 dan Redeploy |
| 9 | Halaman muncul tapi lambat sekali pertama kali | Cold start serverless normal (2–5 detik). Setelah dibuka, halaman di-cache PWA |
| 10 | PWA tidak bisa di-install | Pastikan membuka via **HTTPS** (https://... bukan http://) dan login dulu |

---

## Rollback — Kembali ke Server Lokal (darurat)

Kalau cloud bermasalah parah, operasional kembali ke PC gudang dalam 3 langkah:

1. Pastikan `.env` lokal masih menunjuk `DATABASE_URL` ke `localhost:3306` (kebalikan dari Fase 2.1)
2. Build + start ulang:
   ```powershell
   npm run build
   npm run start
   ```
   (atau command yang biasa kamu pakai untuk server produksi gudang)
3. Tablet di jaringan gudang buka alamat lokal lagi

Server lokal dan cloud adalah **dua sistem independen** (database berbeda) — data terakhir yang dipakai adalah yang dipakai saat itu. Untuk mencegah kebingungan, pilih satu sebagai sistem utama.

---

## Glosarium (referensi cepat)

- **Hosting / deploy** — menaruh aplikasi di server agar bisa diakses via internet
- **Serverless** — model hosting Vercel: kode jalan saat diminta, tanpa perlu kelola server sendiri (itulah kenapa gratis)
- **Free tier** — batas pemakaian gratis; kalau lewat batas, perlu upgrade (tidak akan untuk skala ini)
- **SSE** — cara aplikasi memberi tahu halaman lain "ada data baru" secara real-time (dipakai Pos 1 ↔ Pos 2)
- **PWA** — aplikasi web yang bisa di-install seperti app di tablet (sudah dipasang di TobakOS)
- **WebSerial** — fitur Chrome untuk komunikasi dengan timbangan USB — hanya jalan di **HTTPS**
- **Migration Prisma** — file di `prisma/migrations/` yang berisi SQL pembuat tabel; `migrate deploy` menerapkannya ke database mana pun
