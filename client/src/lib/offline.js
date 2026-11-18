// Peta offline: data jalan, bangunan, dan air dari OpenStreetMap diunduh SEKALI lewat Overpass API untuk area yang sedang dilihat,
// disimpan di browser, lalu digambar sendiri (lihat lib/offlinePaint.js). Ubin gambar OpenStreetMap sendiri tidak boleh disimpan
// untuk dipakai offline, tetapi datanya boleh: lisensinya terbuka (ODbL), asal mencantumkan "© OpenStreetMap contributors".
// File ini murni (tanpa React/Leaflet): menyusun pertanyaan, merapikan jawaban, dan hitungan proyeksi peta.

export const MAX_AREA_KM2 = 25 // lebih luas dari ini datanya terlalu besar untuk diunduh dan digambar dengan lancar
export const OVERPASS_URLS = ['https://overpass-api.de/api/interpreter', 'https://overpass.private.coffee/api/interpreter'] // dicoba berurutan

const round = (value, digits = 6) => Number(value.toFixed(digits))

/** Pertanyaan untuk Overpass (bahasa Overpass QL) bagi satu kotak [selatan, barat, utara, timur]. */
export const overpassQuery = (bounds) => `[out:json][timeout:60][bbox:${bounds.map((value) => round(value, 5)).join(',')}];
(
  way[highway];
  way[waterway];
  way[aeroway~"^(runway|taxiway)$"];
  way[building];
  way[natural~"^(water|wood|scrub)$"];
  way[landuse~"^(forest|grass|meadow|farmland|orchard|reservoir|basin)$"];
  way[leisure~"^(park|pitch|garden)$"];
  relation[natural=water];
);
out geom;`

/** Luas kotak [selatan, barat, utara, timur] dalam km² (cukup akurat untuk area kecil). */
export function areaKm2([south, west, north, east]) {
  const kmPerDegree = 111.32
  return (north - south) * kmPerDegree * (east - west) * kmPerDegree * Math.cos((((south + north) / 2) * Math.PI) / 180)
}

const ROADS = {
  motorway: 'major', trunk: 'major', primary: 'major', secondary: 'major', tertiary: 'major',
  residential: 'minor', unclassified: 'minor', service: 'minor', living_street: 'minor', pedestrian: 'minor', road: 'minor',
  footway: 'path', path: 'path', track: 'path', cycleway: 'path', steps: 'path', bridleway: 'path',
}
const STREAMS = ['river', 'stream', 'canal', 'drain', 'ditch']

/** Label OpenStreetMap -> jenis yang kita gambar, atau null bila tidak digambar. */
export function kindOf(tags = {}) {
  if (tags.building) return 'building'
  if (tags.aeroway) return 'runway'
  if (tags.highway) return ROADS[tags.highway.replace('_link', '')] ?? null
  if (tags.waterway) return STREAMS.includes(tags.waterway) ? 'stream' : null
  if (tags.natural === 'water' || tags.landuse === 'reservoir' || tags.landuse === 'basin') return 'water'
  if (tags.natural || tags.landuse || tags.leisure) return 'green'
  return null
}

const same = (a, b) => a.lat === b.lat && a.lon === b.lon

/** Danau besar disimpan sebagai beberapa potong garis tepi. Sambungkan potongan yang ujungnya bertemu menjadi garis utuh. */
export function joinLines(lines) {
  const rest = lines.filter((line) => line?.length > 1).map((line) => [...line])
  const joined = []
  while (rest.length) {
    let line = rest.shift()
    for (let i = 0; i < rest.length && !same(line[0], line.at(-1)); i++) {
      const next = rest[i]
      const fits = same(line.at(-1), next[0]) ? next : same(line.at(-1), next.at(-1)) ? next.toReversed() : null
      if (!fits) continue
      line = [...line, ...fits.slice(1)]
      rest.splice(i, 1)
      i = -1 // ujungnya berubah: periksa lagi semua potongan yang tersisa
    }
    joined.push(line)
  }
  return joined
}

/** Jawaban Overpass ({ elements: [...] }) -> daftar ringkas [{ kind, points: [lat, lng, lat, lng, ...] }]. */
export function toFeatures({ elements = [] } = {}) {
  const features = []
  for (const { type, tags, geometry, members = [] } of elements) {
    const kind = kindOf(tags)
    if (!kind) continue
    const lines = type === 'way' ? [geometry] : joinLines(members.filter(({ role }) => role === 'outer').map((member) => member.geometry))
    for (const line of lines) {
      const points = (line ?? []).filter(Boolean).flatMap(({ lat, lon }) => [round(lat), round(lon)])
      if (points.length >= 4) features.push({ kind, points })
    }
  }
  return features
}

/** Proyeksi Web Mercator: lintang/bujur -> titik (x, y) pada peta dunia berukuran 1 x 1. Sama dengan yang dipakai ubin peta biasa. */
export function mercator(lat, lng) {
  const sin = Math.sin((lat * Math.PI) / 180)
  return [(lng + 180) / 360, 0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)]
}

/** Siapkan satu area untuk digambar: tiap bentuk dihitung posisinya di peta dunia (`xy`) dan kotak pembatasnya (`box`), lalu dikelompokkan per jenis. */
export function prepareArea({ id, bounds, savedAt, features }) {
  const [south, west, north, east] = bounds
  const [left, bottom] = mercator(south, west)
  const [right, top] = mercator(north, east)
  const byKind = {}
  for (const { kind, points } of features) {
    const xy = new Float64Array(points.length)
    const box = [Infinity, Infinity, -Infinity, -Infinity]
    for (let i = 0; i < points.length; i += 2) {
      const [x, y] = mercator(points[i], points[i + 1])
      xy[i] = x
      xy[i + 1] = y
      box[0] = Math.min(box[0], x)
      box[1] = Math.min(box[1], y)
      box[2] = Math.max(box[2], x)
      box[3] = Math.max(box[3], y)
    }
    ;(byKind[kind] ??= []).push({ xy, box })
  }
  return { id, bounds, savedAt, count: features.length, box: [left, top, right, bottom], byKind }
}

/** Dua kotak [kiri, atas, kanan, bawah] saling bersinggungan? */
export const overlaps = (a, b) => a[0] <= b[2] && a[2] >= b[0] && a[1] <= b[3] && a[3] >= b[1]
