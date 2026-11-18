import { distance } from './geo.js'

// tabel: id MAVLink, apakah punya koordinat, dan field param yang bisa diedit di UI.
// 'index' = urutan param (0 = param1). Nama dan id harus sama dengan bridge/gcs_bridge/missions.py
export const COMMANDS = {
    WAYPOINT: { id: 16, label: 'Waypoint', position: true, params: [{ index: 0, label: 'Hold', unit: 's', min: 0, max: 600, value: 0 }] },
    LOITER_TURNS: {
        id: 18, label: 'Orbit', position: true,
        params: [{ index: 0, label: 'Turns', unit: '', min: 1, max: 100, value: 1 }, { index: 2, label: 'Radius', unit: 'm', min: 5, max: 500, value: 30 }],
    },
    LOITER_TIME: { id: 19, label: 'Loiter', position: true, params: [{ index: 0, label: 'Time', unit: 's', min: 1, max: 3600, value: 10 }] },
    RTL: { id: 20, label: 'Return to launch', position: false, params: [] },
    LAND: { id: 21, label: 'Land', position: true, params: [] },
    TAKEOFF: { id: 22, label: 'Takeoff', position: true, params: [] },
}

export const COMMAND_BY_ID = Object.fromEntries(Object.entries(COMMANDS).map(([name, { id }]) => [id, name]))
export const MAX_ITEMS = 500
export const DEFAULTS = { alt: 20, speed: 10 }

const known = (cmd) => typeof cmd === 'string' && (Object.hasOwn(COMMANDS, cmd) || /^CMD_\d{1,5}$/.test(cmd))
export const commandId = (cmd) => COMMANDS[cmd]?.id ?? Number(cmd.slice(4))
export const commandName = (id) => COMMAND_BY_ID[id] ?? `CMD_${id}`
// Apakah item punya koordinat di peta? (frame 2 = perintah non-navigasi, x/y bukan koordinat) 
export const isPositional = (item) => item.frame !== 2 && (COMMANDS[item.cmd]?.position ?? Boolean(item.lat || item.lng))

export const newItem = (cmd, point = { lat: 0, lng: 0 }, alt = DEFAULTS.alt) => {
  const { position, params } = COMMANDS[cmd]
  const values = [0, 0, 0, 0]
  params.forEach(({ index, value }) => (values[index] = value))
  return { cmd, lat: position ? point.lat : 0, lng: position ? point.lng : 0, alt: position && cmd !== 'LAND' ? alt : 0, params: values }
}

const toNumber = (value) => (typeof value === 'number' || (typeof value === 'string' && value.trim() !== '') ? Number(value) : NaN)

// Buang item rusak dan paksa semua angka menjadi angka sungguhan. Dipakai untuk file impor dan misi tersimpan.
export const sanitize = (items) =>
  (Array.isArray(items) ? items : [])
    .filter((raw) => raw && typeof raw === 'object' && known(raw.cmd))
    .slice(0, MAX_ITEMS)
    .map(({ cmd, lat, lng, alt, params, frame }) => {
      const [p1, p2, p3, p4] = [...(Array.isArray(params) ? params : []), 0, 0, 0, 0].map((p) => toNumber(p) || 0)
      const item = { cmd, lat: toNumber(lat) || 0, lng: toNumber(lng) || 0, alt: toNumber(alt) || 0, params: [p1, p2, p3, p4] }
      return frame === 2 ? { ...item, frame } : item
    })

// Perkiraan jarak (meter) dan waktu (detik): home -> semua titik -> kembali ke home bila ada RTL. 
export function stats(items, { home, speed = DEFAULTS.speed } = {}) {
  const path = items.filter(isPositional)
  const route = [...(home ? [home] : []), ...path, ...(home && items.some((i) => i.cmd === 'RTL') ? [home] : [])]
  const meters = route.slice(1).reduce((sum, point, i) => sum + distance(route[i], point), 0)
  const hold = items.reduce((sum, { cmd, params: [p1, , p3] }) => {
    if (cmd === 'LOITER_TURNS') return sum + (p1 * 2 * Math.PI * p3) / speed
    return sum + (cmd === 'WAYPOINT' || cmd === 'LOITER_TIME' ? p1 : 0)
  }, 0)
  return { count: items.length, distance: meters, duration: meters / speed + hold }
}
