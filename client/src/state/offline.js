import { MAX_AREA_KM2, OVERPASS_URLS, areaKm2, overpassQuery, prepareArea, toFeatures } from '../lib/offline.js'
import { store } from './store.js'

// Area peta offline disimpan di Cache Storage milik browser (tahan lama, muat puluhan MB), satu berkas JSON per area.
// Datanya besar, jadi disimpan di variabel ini, bukan di store; yang masuk store hanya ringkasannya supaya layar ikut berubah.
const CACHE = 'gcs-offline-map'
const FETCH_TIMEOUT_MS = 90_000
let areas = []

/** Area yang siap digambar (hasil prepareArea). */
export const offlineAreas = () => areas

const publish = (patch = {}) =>
  store.set(({ offline }) => ({ offline: { ...offline, areas: areas.length, objects: areas.reduce((sum, area) => sum + area.count, 0), ...patch } }))

// Browser hanya menyediakan Cache Storage di localhost atau HTTPS. Tanpa itu area tetap bisa dipakai, tetapi hilang saat halaman ditutup.
const openCache = () => (globalThis.caches ? caches.open(CACHE) : null)

/** Dipanggil sekali saat aplikasi dibuka: muat semua area yang pernah disimpan. */
export async function loadOffline() {
  try {
    const cache = await openCache()
    const saved = cache ? await Promise.all((await cache.keys()).map(async (key) => (await cache.match(key)).json())) : []
    areas = saved.map(prepareArea)
  } catch {
    areas = [] // simpanan rusak atau ditolak browser: mulai kosong
  }
  publish()
}

/** Tanya server Overpass satu per satu sampai ada yang menjawab. */
async function askOverpass(query) {
  for (const url of OVERPASS_URLS) {
    try {
      const response = await fetch(url, { method: 'POST', body: new URLSearchParams({ data: query }), signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) })
      if (!response.ok) continue
      const reply = await response.json()
      if (reply.elements?.length || !reply.remark) return reply // `remark` tanpa isi = server kehabisan waktu atau memori
    } catch {
      // server ini tidak terjangkau: coba yang berikutnya
    }
  }
  throw new Error('The map data server did not answer. Check the internet connection and try again.')
}

/** Unduh dan simpan area [selatan, barat, utara, timur]. Mengembalikan jumlah bentuk yang tersimpan; melempar Error berisi pesan untuk pengguna. */
export async function saveArea(bounds) {
  const size = areaKm2(bounds)
  if (size > MAX_AREA_KM2) throw new Error(`This view covers ${size.toFixed(0)} km². Zoom in until it is under ${MAX_AREA_KM2} km², then save again.`)
  publish({ busy: true })
  try {
    const features = toFeatures(await askOverpass(overpassQuery(bounds)))
    if (!features.length) throw new Error('No roads or buildings were found in this view, so nothing was saved.')
    const area = { id: `area-${Date.now()}`, bounds, savedAt: Date.now(), features }
    const cache = await openCache()
    await cache?.put(`/offline/${area.id}.json`, new Response(JSON.stringify(area), { headers: { 'content-type': 'application/json' } }))
    areas = [...areas, prepareArea(area)]
    return { count: features.length, kept: Boolean(cache) }
  } finally {
    publish({ busy: false })
  }
}

/** Hapus semua area tersimpan. */
export async function clearOffline() {
  await globalThis.caches?.delete(CACHE)
  areas = []
  publish()
}
