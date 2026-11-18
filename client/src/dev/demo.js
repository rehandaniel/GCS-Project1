import { destination } from '../lib/geo.js'
import { addEvent } from '../state/events.js'
import { store } from '../state/store.js'
import { applyFrame } from '../state/telemetry.js'

// Telemetri PALSU untuk mengembangkan tampilan tanpa bridge/kendaraan. Hanya aktif di `npm run dev` dengan ?demo,
// dan tidak ikut ke build produksi (import.meta.env.DEV bernilai false di sana).
const CENTER = { lat: -7.77069, lng: 110.37786 }
const RADIUS = 160 // m
const SPEED = 11 // m/s

// ?demo=<nama> memilih jenis kendaraan, untuk melihat ikonnya: `type` = kelompok dari bridge, `mavType` = angka MAV_TYPE.
const KINDS = {
  quad: { type: 'copter', mavType: 2 },
  hexa: { type: 'copter', mavType: 13 },
  octo: { type: 'copter', mavType: 14 },
  tri: { type: 'copter', mavType: 15 },
  heli: { type: 'copter', mavType: 4 },
  plane: { type: 'plane', mavType: 1 },
  vtol: { type: 'plane', mavType: 20 },
  rover: { type: 'rover', mavType: 10 },
  boat: { type: 'rover', mavType: 11 },
  sub: { type: 'sub', mavType: 12 },
}

export function startDemo(name) {
  const kind = KINDS[name] ?? KINDS.quad
  store.set({ demo: true, online: true, bridge: true })
  addEvent({ level: 'warn', text: 'DEMO mode: telemetry is simulated by the browser' })
  let angle = 0
  let battery = 100
  const startedAt = Date.now()
  setInterval(() => {
    angle = (angle + (SPEED / RADIUS) * 0.2 * (180 / Math.PI)) % 360
    battery = Math.max(5, battery - 0.01)
    const { lat, lng } = destination(CENTER, angle, RADIUS)
    const wave = Math.sin(((Date.now() - startedAt) / 1000) * 0.9)
    applyFrame({
      link: 'connected', connection: 'demo', sysid: 1, compid: 1, ...kind, autopilot: 'ArduPilot', firmware: '4.5.7 (demo)', armed: true, mode: 'LOITER',
      modes: ['STABILIZE', 'ALT_HOLD', 'AUTO', 'GUIDED', 'LOITER', 'RTL', 'LAND'],
      lat, lng, alt: 150, relAlt: 40 + wave * 2, groundSpeed: SPEED + wave, airSpeed: SPEED, climb: wave * 0.5, heading: (angle + 90) % 360, throttle: 55,
      roll: 14 * Math.cos(angle / 20), pitch: -3 + wave * 2, yaw: (angle + 90) % 360, batteryPct: Math.round(battery), batteryVolt: 14.2 + battery / 100, batteryCurrent: 12,
      gpsFix: 3, gpsFixText: '3D Fix', sats: 14, hdop: 0.8, homeLat: CENTER.lat, homeLng: CENTER.lng, homeDist: RADIUS, wp: 2, wpDist: 45, linkAge: 0, rate: 5, recording: false,
    })
  }, 200)
}
