// Gerak halus. Telemetri datang 5 kali per detik, sedangkan layar digambar 60 kali per detik.
// Di antara dua data, nilai yang tampil "mengejar" nilai terbaru sedikit demi sedikit (lihat hooks/useChase.js).
// Semua fungsi di sini murni (tanpa React) supaya bisa diuji.

const RATE = 12 // seberapa cepat mengejar: makin besar makin sigap. 12 = hampir sampai dalam ~0,2 detik
const NEAR = 1e-7 // selisih sekecil ini dianggap sudah sampai (untuk koordinat: sekitar 1 cm)

/** Sudut `to` versi yang paling dekat dengan `from`, supaya putaran lewat jalan terpendek: dari 350 ke 10 menjadi 350 ke 370. */
export const unwrap = (from, to) => from + ((((to - from) % 360) + 540) % 360) - 180

/**
 * Satu langkah mengejar. `now` = nilai yang sedang tampil, `goal` = nilai terbaru, keduanya objek angka seperti { roll, pitch }.
 * `dt` = detik sejak langkah sebelumnya. `angles` = nama field yang berupa sudut 0..360 (mis. heading).
 */
export function chase(now, goal, dt, angles = [], rate = RATE) {
  if (!now) return { ...goal } // langkah pertama: langsung di tempat
  const share = 1 - Math.exp(-rate * dt) // bagian jarak yang ditempuh pada langkah ini (0..1)
  return Object.fromEntries(
    Object.entries(goal).map(([key, to]) => {
      const from = now[key]
      if (!Number.isFinite(from) || !Number.isFinite(to)) return [key, to] // belum ada angka: tidak ada yang dikejar
      const end = angles.includes(key) ? unwrap(from, to) : to
      const next = from + (end - from) * share
      return [key, Math.abs(end - next) < NEAR ? end : next] // sudah sangat dekat: langsung tepat di tujuan
    }),
  )
}

/** Sudah sampai di tujuan? Dipakai untuk menghentikan animasi supaya tidak membuang baterai. */
export const settled = (now, goal, angles = []) =>
  Object.entries(goal).every(([key, to]) => {
    const from = now?.[key]
    if (!Number.isFinite(from) || !Number.isFinite(to)) return Object.is(from, to)
    return Math.abs((angles.includes(key) ? unwrap(from, to) : to) - from) < NEAR
  })
