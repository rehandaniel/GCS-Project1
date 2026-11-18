// Pembuat jalur "mower" (zig-zag) untuk memetakan area poligon.
const EARTH_RADIUS = 6_371_000
const rad = (deg) => (deg * Math.PI) / 180
const deg = (radians) => (radians * 180) / Math.PI

// Proyeksi datar lokal (meter) di sekitar `origin`; cukup akurat untuk area survey beberapa kilometer. 
const projection = (origin) => {
  const k = Math.cos(rad(origin.lat))
  return {
    toXY: ({ lat, lng }) => ({ x: rad(lng - origin.lng) * EARTH_RADIUS * k, y: rad(lat - origin.lat) * EARTH_RADIUS }),
    toLatLng: ({ x, y }) => ({ lat: origin.lat + deg(y / EARTH_RADIUS), lng: origin.lng + deg(x / (EARTH_RADIUS * k)) }),
  }
}

const rotate = ({ x, y }, angle) => ({ x: x * Math.cos(angle) - y * Math.sin(angle), y: x * Math.sin(angle) + y * Math.cos(angle) })
const mean = (values) => values.reduce((sum, value) => sum + value, 0) / values.length

// Luas poligon dalam m² (rumus shoelace). 
export const area = (polygon) => {
  if (polygon.length < 3) return 0
  const { toXY } = projection({ lat: mean(polygon.map((p) => p.lat)), lng: mean(polygon.map((p) => p.lng)) })
  const xy = polygon.map(toXY)
  return Math.abs(xy.reduce((sum, p, i) => sum + p.x * xy[(i + 1) % xy.length].y - xy[(i + 1) % xy.length].x * p.y, 0)) / 2
}

// Titik potong garis horizontal `y` dengan sisi-sisi poligon, urut dari kiri ke kanan. */
const crossings = (xy, y) =>
  xy
    .flatMap((p, i) => {
      const q = xy[(i + 1) % xy.length]
      return p.y <= y !== q.y <= y ? [p.x + ((y - p.y) * (q.x - p.x)) / (q.y - p.y)] : []
    })
    .sort((a, b) => a - b)

/**
 * Jalur terbang yang menyapu `polygon` ([{lat,lng}]).
 * @param spacing jarak antar jalur (meter)  @param heading arah jalur, derajat dari utara
 * @returns titik-titik [{lat,lng}] berurutan, jalur genap ke kanan lalu jalur ganjil ke kiri
 */
export function surveyPath(polygon, { spacing = 20, heading = 0 } = {}) {
  if (polygon.length < 3 || !(spacing > 0)) return []
  const { toXY, toLatLng } = projection({ lat: mean(polygon.map((p) => p.lat)), lng: mean(polygon.map((p) => p.lng)) })
  const turn = rad(heading - 90) // putar supaya arah jalur sejajar sumbu-x
  const xy = polygon.map((p) => rotate(toXY(p), turn))
  const ys = xy.map((p) => p.y)
  const [minY, maxY] = [Math.min(...ys), Math.max(...ys)]
  const extent = maxY - minY
  const lines = Math.max(1, Math.ceil(extent / spacing - 1e-3)) // -1e-3: kelebihan beberapa cm diabaikan agar tidak ada jalur tepat di tepi
  const first = minY + (extent - (lines - 1) * spacing) / 2 // tiap jalur berada di tengah strip selebar `spacing`

    return Array.from({ length: lines }, (_, i) => first + i * spacing)
    .map((y) => ({ y, xs: crossings(xy, y) }))
    .flatMap(({ y, xs }, i) => {
      const segments = Array.from({ length: Math.floor(xs.length / 2) }, (_, s) => [xs[s * 2], xs[s * 2 + 1]])
      const ordered = i % 2 ? segments.map(([a, b]) => [b, a]).reverse() : segments
      return ordered.flat().map((x) => ({ x, y }))
    })
    .map((p) => toLatLng(rotate(p, -turn)))
}

