import { distance } from '../lib/geo.js'
import { store } from './store.js'

const TRACK_MAX = 3000
const TRACK_STEP_M = 2 // titik jejak baru hanya bila bergerak ≥ 2 m

/** Terapkan satu frame telemetri: simpan sebagai `t` dan perpanjang jejak terbang. */
export const applyFrame = (frame) =>
  store.set(({ t, track }) => {
    const { lat, lng, armed } = frame
    const flightStarted = armed && !t.armed // jejak lama dihapus saat penerbangan baru dimulai
    const base = flightStarted ? [] : track
    const last = base.at(-1)
    const moved = lat != null && lng != null && (!last || distance(last, { lat, lng }) >= TRACK_STEP_M)
    return { t: frame, track: moved ? [...base.slice(1 - TRACK_MAX), { lat, lng }] : base }
  })