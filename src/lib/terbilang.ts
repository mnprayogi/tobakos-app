const SATUAN = [
  "",
  "satu",
  "dua",
  "tiga",
  "empat",
  "lima",
  "enam",
  "tujuh",
  "delapan",
  "sembilan",
  "sepuluh",
  "sebelas",
]

const TINGKAT = ["", "ribu", "juta", "miliar", "triliun"]

function sebutNilai(angka: number): string {
  const n = Math.abs(angka)
  if (n < 12) return SATUAN[n]
  if (n < 20) return `${SATUAN[n - 10]} belas`
  if (n < 100) {
    const puluh = Math.floor(n / 10)
    const sisa = n % 10
    return sisa === 0 ? `${SATUAN[puluh]} puluh` : `${SATUAN[puluh]} puluh ${SATUAN[sisa]}`
  }
  if (n < 200) return sisaRatus(n, "seratus")
  if (n < 1000) {
    const ratus = Math.floor(n / 100)
    const sisa = n % 100
    return sisa === 0 ? `${SATUAN[ratus]} ratus` : `${SATUAN[ratus]} ratus ${sebutNilai(sisa)}`
  }
  return sebutKelipatan(n)
}

function sisaRatus(angka: number, kata: string): string {
  const sisa = angka % 100
  return sisa === 0 ? kata : `${kata} ${sebutNilai(sisa)}`
}

function sebutKelipatan(angka: number): string {
  const chunks: number[] = []
  let n = Math.abs(angka)
  while (n > 0) {
    chunks.push(n % 1000)
    n = Math.floor(n / 1000)
  }
  const words: string[] = []
  for (let i = chunks.length - 1; i >= 0; i--) {
    const chunk = chunks[i]
    if (chunk === 0) continue
    if (i === 1 && chunk === 1) {
      words.push("seribu")
      continue
    }
    words.push(i === 0 ? sebutNilai(chunk) : `${sebutNilai(chunk)} ${TINGKAT[i]}`)
  }
  return words.join(" ")
}

export function terbilang(angka: number | string): string {
  const n = Math.round(Number(angka))
  if (Number.isNaN(n)) return ""
  if (n === 0) return "nol"
  const negatif = n < 0 ? "minus " : ""
  return `${negatif}${sebutKelipatan(n)}`.replace(/\s+/g, " ").trim()
}

export function formatTerbilangRupiah(angka: number | string): string {
  const kata = terbilang(angka)
  if (!kata) return ""
  const hurufKecil = `${kata} rupiah`
  return hurufKecil.charAt(0).toUpperCase() + hurufKecil.slice(1)
}
