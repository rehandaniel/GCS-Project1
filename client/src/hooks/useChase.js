import { useEffect, useRef } from 'react'
import { chase, settled } from '../lib/smooth.js'

// Orang yang meminta "kurangi gerak" di pengaturan sistem mendapat nilai terbaru secara langsung, tanpa animasi.
const calm = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * Membuat tampilan bergerak halus di antara dua data telemetri.
 * `goal`   = nilai terbaru, objek angka seperti { roll, pitch, heading }.
 * `paint`  = fungsi yang menggambar satu frame memakai nilai yang sedang "mengejar" (dipanggil sampai 60 kali per detik).
 * `angles` = nama field yang berupa sudut 0..360, supaya berputar lewat jalan terpendek.
 * Animasi berhenti sendiri begitu nilainya sampai, jadi tidak ada kerja sia-sia saat kendaraan diam.
 */
export function useChase(goal, paint, angles = []) {
  const latest = useRef({ goal, paint })
  const now = useRef(null) // nilai yang sedang tampil
  const frame = useRef(0) // nomor animasi yang sedang berjalan, 0 = berhenti

  useEffect(() => {
    latest.current = { goal, paint }
    if (frame.current) return // animasi masih berjalan: ia akan memakai tujuan yang baru
    let before = performance.now()
    const step = (time) => {
      const dt = Math.min(Math.max((time - before) / 1000, 0), 0.1) // jeda panjang (tab disembunyikan) tidak membuat lompatan aneh
      before = time
      const { goal, paint } = latest.current
      now.current = calm() ? { ...goal } : chase(now.current, goal, dt, angles)
      paint(now.current)
      frame.current = settled(now.current, goal, angles) ? 0 : requestAnimationFrame(step)
    }
    frame.current = requestAnimationFrame(step)
  })

  useEffect(
    () => () => {
      cancelAnimationFrame(frame.current) // komponen dilepas: hentikan animasi
      frame.current = 0
    },
    [],
  )
}
