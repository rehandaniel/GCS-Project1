const EARTH_RADIUS = 6_371_000 // meter
const toRad = (deg) => (deg * Math.PI) / 180
const toDeg = (rad) => (rad * 180) / Math.PI

export const clamp = (value, min, max) => Math.min(max, Math.max(min, value))
export const wrap360 = (deg) => ((deg % 360) + 360) % 360

// Jarak (meter) antara dua titik { lat, lng } — rumus haversine. 
export const distance = (a, b) => {
    const dLat = toRad(b.lat - a.lat)
    const dLng = toRad(b.lng - a.lng)
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2
    return 2 * EARTH_RADIUS * Math.asin(Math.sqrt(h))
}


// Arah 0-360 degree (0 = utara) dari a ke b.
export const bearing = (a, b) => {
    const dLng = toRad(b.lng - a.lng)
    const y = Math.sin(dLng) * Math.cos(toRad(b.lat))
    const x = Math.cos(toRad(a.lat)) * Math.sin(toRad(b.lat)) - Math.sin(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.cos(dLng)
    return wrap360(toDeg(Math.atan2(y, x)))
}

// Titik tujuan bila bergerak `meters` dari `from` ke arah `deg`.
export const destination = (from, deg, meters) => {
    const d = meters / EARTH_RADIUS
    const brg = toRad(deg)
    const lat1 = toRad(from.lat)
    const lat2 = Math.asin(Math.sin(lat1) * Math.cos(d) + Math.cos(lat1) * Math.sin(d) * Math.cos(brg))
    const lng2 = toRad(from.lng) + Math.atan2(Math.sin(brg) * Math.sin(d) * Math.cos(lat1), Math.cos(d) - Math.sin(lat1) * Math.sin(lat2))
    return { lat: toDeg(lat2), lng: toDeg(lng2) }
}