// Satu tabel untuk semua angka telemetri: nama field (sama dengan frame dari bridge), label untuk manusia, satuan, dan jumlah desimal.
// Dipakai oleh bilah data di bawah peta dan oleh halaman Parameters > Live data.

export const GROUPS = [
  { title: 'Link', fields: [
    { key: 'link', label: 'Link state' },
    { key: 'connection', label: 'Connection' },
    { key: 'rate', label: 'Messages received', unit: 'per second', digits: 0 },
    { key: 'linkAge', label: 'Last heartbeat', unit: 's ago', digits: 1 },
    { key: 'recording', label: 'Recording to .tlog' },
  ] },
  { title: 'Vehicle', fields: [
    { key: 'type', label: 'Vehicle group' },
    { key: 'mavType', label: 'MAVLink vehicle type', digits: 0 },
    { key: 'autopilot', label: 'Autopilot' },
    { key: 'firmware', label: 'Firmware version' },
    { key: 'sysid', label: 'System ID', digits: 0 },
    { key: 'compid', label: 'Component ID', digits: 0 },
    { key: 'armed', label: 'Motors armed' },
    { key: 'mode', label: 'Flight mode' },
  ] },
  { title: 'Position', fields: [
    { key: 'lat', label: 'Latitude', unit: '°', digits: 6, wide: true },
    { key: 'lng', label: 'Longitude', unit: '°', digits: 6, wide: true },
    { key: 'alt', label: 'Altitude MSL', unit: 'm', digits: 1 },
    { key: 'relAlt', label: 'Altitude above home', short: 'Altitude rel.', unit: 'm', digits: 1 },
    { key: 'homeLat', label: 'Home latitude', unit: '°', digits: 6 },
    { key: 'homeLng', label: 'Home longitude', unit: '°', digits: 6 },
    { key: 'homeDist', label: 'Distance from home', unit: 'm', digits: 0 },
  ] },
  { title: 'Attitude', fields: [
    { key: 'roll', label: 'Roll', unit: '°', digits: 1 },
    { key: 'pitch', label: 'Pitch', unit: '°', digits: 1 },
    { key: 'yaw', label: 'Yaw', unit: '°', digits: 1 },
    { key: 'heading', label: 'Heading', unit: '°', digits: 0 },
  ] },
  { title: 'Speed', fields: [
    { key: 'groundSpeed', label: 'Ground speed', short: 'Ground', unit: 'm/s', digits: 1 },
    { key: 'airSpeed', label: 'Air speed', short: 'Air', unit: 'm/s', digits: 1 },
    { key: 'climb', label: 'Climb rate', short: 'Climb', unit: 'm/s', digits: 1 },
    { key: 'throttle', label: 'Throttle', unit: '%', digits: 0 },
  ] },
  { title: 'Power', fields: [
    { key: 'batteryPct', label: 'Battery remaining', unit: '%', digits: 0 },
    { key: 'batteryVolt', label: 'Battery voltage', unit: 'V', digits: 2 },
    { key: 'batteryCurrent', label: 'Battery current', unit: 'A', digits: 1 },
  ] },
  { title: 'GPS', fields: [
    { key: 'gpsFixText', label: 'Fix' },
    { key: 'sats', label: 'Satellites', digits: 0 },
    { key: 'hdop', label: 'HDOP', digits: 2 },
  ] },
  { title: 'Mission', fields: [
    { key: 'wp', label: 'Current waypoint', digits: 0 },
    { key: 'wpDist', label: 'Distance to waypoint', unit: 'm', digits: 0 },
  ] },
]

// Bilah data di bawah peta hanya menampilkan sebagian: field yang juga tersimpan di rekaman penerbangan.
const BAR_KEYS = { Position: ['lat', 'lng', 'alt', 'relAlt'], Attitude: ['roll', 'pitch', 'yaw'], Speed: ['groundSpeed', 'airSpeed', 'climb'] }
export const BAR_GROUPS = GROUPS.filter(({ title }) => BAR_KEYS[title]).map(({ title, fields }) => ({
  title,
  fields: BAR_KEYS[title].map((key) => fields.find((field) => field.key === key)),
}))

/** Nilai satu field sebagai teks. Belum ada data (null, undefined, NaN, teks kosong) tampil sebagai tanda pisah, bukan 0. */
export function formatField(frame, { key, digits }) {
  const value = frame?.[key]
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (typeof value === 'number') return Number.isFinite(value) ? value.toFixed(digits ?? 0) : '—'
  return value ? String(value) : '—'
}

/** Field yang cocok dengan kata pencarian (dicari di label dan nama field), tetap terkelompok. Kelompok kosong dibuang. */
export const searchFields = (query) => {
  const words = query.trim().toLowerCase()
  return GROUPS.map(({ title, fields }) => ({
    title,
    fields: fields.filter(({ key, label }) => `${label} ${key} ${title}`.toLowerCase().includes(words)),
  })).filter(({ fields }) => fields.length)
}
