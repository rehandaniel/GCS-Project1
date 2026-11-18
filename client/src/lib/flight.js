/** Hasil `GET /api/flights/:id` ({ columns, samples: [[...]] }) -> daftar objek { t, lat, lng, alt, relAlt, ... } sesuai nama kolom. */
export const toSamples = ({ columns, samples }) => samples.map((row) => Object.fromEntries(columns.map((name, i) => [name, row[i]])))

/** Sampel terakhir yang waktunya tidak melewati `t` detik (pencarian biner; `samples` terurut menurut waktu). */
export function sampleAt(samples, t) {
  let low = 0
  let high = samples.length - 1
  while (low < high) {
    const middle = Math.ceil((low + high) / 2)
    if (samples[middle].t <= t) low = middle
    else high = middle - 1
  }
  return samples[low]
}

/** Jejak untuk digambar di peta: [[lat, lng], ...] tanpa sampel yang belum punya posisi. */
export const trackOf = (samples) => samples.filter(({ lat, lng }) => lat != null && lng != null).map(({ lat, lng }) => [lat, lng])

/** Satu baris per nama file: file .tlog di folder log digabung dengan penerbangan yang sudah ada di database (`flight`, atau null). */
export function mergeLogs(files, flights) {
  const saved = new Map(flights.map((flight) => [flight.logName, flight]))
  const rows = files.map(({ name, size, modifiedAt }) => ({ name, size, modifiedAt, flight: saved.get(name) ?? null }))
  const known = new Set(files.map(({ name }) => name))
  const orphans = flights.filter(({ logName }) => !known.has(logName)).map((flight) => ({ name: flight.logName, size: null, modifiedAt: flight.importedAt, flight }))
  return [...rows, ...orphans].sort((a, b) => b.modifiedAt - a.modifiedAt)
}