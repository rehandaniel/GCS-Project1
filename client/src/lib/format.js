import { wrap360 } from './geo.js'

const pad = (n) => String(n).padStart(2, '0')
const CARDINALS =['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']

// 125 -> "02:05", 3725 -> "1:02:05"
export const formatDuration = (seconds) => {
    const total = Math.round(seconds)
    const [h, m, s] = [Math.floor(total / 3600), Math.floor((total % 3600) / 60), total % 60]
    return h ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`
}

export const formatDistance = (meters) => (meters >= 1000 ? `${(meters / 1000).toFixed(2)} km` : `${Math.round(meters)} m`)

// 315 -> "NW"
export const cardinal = (deg) => CARDINALS[Math.round(wrap360(deg) / 45) % 8]

export const formatBytes = (bytes) => (bytes >= 1048576 ? `${(bytes / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`)
