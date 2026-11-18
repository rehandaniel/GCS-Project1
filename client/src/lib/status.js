// Aturan sederhana yang mengubah angka telemetri menjadi status yang dibaca manusia.
// Semua murni (tanpa React) supaya bisa diuji.

export const batteryTone = (pct) => (pct == null ? '' : pct < 20 ? 'bad' : pct < 40 ? 'warn' : 'ok')

// Tingkat kecepatan terhadap batas gauge (0..1+): dipakai untuk badge di gauge kecepatan.
export const speedLevel = (ratio) => (ratio < 0.08 ? ['Hover', ''] : ratio < 0.8 ? ['Cruise', 'ok'] : ['High', 'bad'])

// Satu peringatan paling penting untuk ditampilkan di kartu kendaraan, atau null. [tone, teks]
export const warningFor = ({ link, gpsFix, batteryPct }) => {
  if (link === 'lost') return ['bad', 'Telemetry link lost. The vehicle follows its own failsafe settings.']
  if (link !== 'connected') return ['', 'No vehicle connected. Press Connect at the top right.']
  if (batteryPct != null && batteryPct < 20) return ['bad', `Battery at ${batteryPct}%. Land or return now.`]
  if (gpsFix < 3) return ['warn', 'No 3D GPS fix yet. Wait before arming.']
  if (batteryPct != null && batteryPct < 40) return ['warn', `Battery at ${batteryPct}%. Plan to land soon.`]
  return null
}

const LINK = { connected: ['Connected', 'ok'], connecting: ['Connecting…', 'warn'], lost: ['Link lost', 'bad'], disconnected: ['No vehicle', 'warn'] }

// Keadaan sambungan untuk bilah status. Rantainya: browser -> server -> bridge -> kendaraan; yang putus paling dekat dilaporkan dulu. [teks, tone]
export const linkStatus = (online, bridge, link) => (!online ? ['Server offline', 'bad'] : !bridge ? ['Bridge offline', 'bad'] : (LINK[link] ?? LINK.disconnected))
