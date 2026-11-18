// Validasi permintaan dari browser sebelum diteruskan ke bridge. Hanya yang ada di daftar ini yang lolos.
const MAX_ITEMS = 500

const isPlainObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value)
const isNumber = (value) => typeof value === 'number' && Number.isFinite(value)
const isText = (value, max) => typeof value === 'string' && value.length > 0 && value.length <= max
// Object.hasOwn mencegah nama seperti "constructor" atau "__proto__" dianggap perintah
const own = (table, key) => (typeof key === 'string' && Object.hasOwn(table, key) ? table[key] : undefined)

// Setiap perintah: fungsi yang mengembalikan argumen bersih, atau null bila bentuknya salah.
const COMMANDS = {
  arm: () => ({}),
  disarm: () => ({}),
  land: () => ({}),
  rtl: () => ({}),
  auto: () => ({}),
  pause: () => ({}),
  takeoff: ({ alt }) => (isNumber(alt) ? { alt } : null),
  mode: ({ mode }) => (isText(mode, 32) ? { mode } : null),
  goto: ({ lat, lng, alt }) => ([lat, lng, alt].every(isNumber) ? { lat, lng, alt } : null),
}

const REQUESTS = {
  command: {
    timeoutMs: 8_000,
    payload: (request) => {
      const args = own(COMMANDS, request.name)?.(request)
      return args && { name: request.name, ...args }
    },
  },
  'mission.upload': {
    timeoutMs: 20_000,
    payload: ({ items }) => (Array.isArray(items) && items.length > 0 && items.length <= MAX_ITEMS && items.every(isPlainObject) ? { items } : null),
  },
  'mission.download': { timeoutMs: 20_000, payload: () => ({}) },
  'mission.clear': { timeoutMs: 20_000, payload: () => ({}) },
  'link.connect': { timeoutMs: 12_000, payload: ({ connection }) => (isText(connection, 200) ? { connection } : null) },
  'link.disconnect': { timeoutMs: 3_000, payload: () => ({}) },
  'link.ports': { timeoutMs: 3_000, payload: () => ({}) },
  'log.start': { timeoutMs: 3_000, payload: () => ({}) },
  'log.stop': { timeoutMs: 3_000, payload: () => ({}) },
  // Tambahan parameter: baca seluruh parameter autopilot (hanya baca). Lewat radio telemetri bisa lebih dari satu menit.
  'param.list': { timeoutMs: 120_000, payload: () => ({}) },
}

export class BadRequest extends Error {}

/** Periksa permintaan dari browser. Hasilnya aman diteruskan ke bridge. */
export function parseRequest(request) {
  if (!isPlainObject(request)) throw new BadRequest('Request must be an object')
  const spec = own(REQUESTS, request.type)
  const payload = spec?.payload(request)
  if (!payload) throw new BadRequest(`Invalid request: ${String(request.type).slice(0, 40)}`)
  return { type: request.type, payload, timeoutMs: spec.timeoutMs }
}
