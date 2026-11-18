// Parameter autopilot (setelan di dalam kendaraan, mis. ATC_RAT_RLL_P). Hanya dibaca dan ditampilkan, tidak diubah.
// Tiap parameter: { name, value, type }. File ini murni supaya bisa diuji.

/**
 * Kelompok parameter = awalan nama sebelum garis bawah pertama: "ATC_RAT_RLL_P" -> "ATC", "SERIAL1_BAUD" -> "SERIAL1".
 * Nama tanpa garis bawah dibuang angka di belakangnya, supaya FLTMODE1 sampai FLTMODE6 satu kelompok: "FLTMODE1" -> "FLTMODE".
 */
export const paramGroup = (name) => (name.includes('_') ? name.split('_')[0] : name.replace(/\d+$/, '') || name)

/** Angka parameter sebagai teks: bilangan bulat tanpa koma, pecahan tanpa nol berlebih. */
export const formatParam = (value) => (Number.isFinite(value) ? String(Number(value.toPrecision(7))) : '—')

/** Saring menurut kata pencarian (tanpa membedakan huruf besar/kecil). Beberapa kata = semua harus cocok. */
export function filterParams(items, query) {
  const words = query.trim().toUpperCase().split(/\s+/).filter(Boolean)
  return words.length ? items.filter(({ name }) => words.every((word) => name.includes(word))) : items
}

/** Kelompokkan daftar yang sudah urut nama: [['ATC', [...]], ['BATT', [...]]]. */
export function groupParams(items) {
  const groups = new Map()
  for (const item of items) {
    const key = paramGroup(item.name)
    groups.set(key, [...(groups.get(key) ?? []), item])
  }
  return [...groups]
}

/** Isi file .param (format Mission Planner): satu baris "NAMA,NILAI" per parameter. */
export const toParamFile = (items) => items.map(({ name, value }) => `${name},${formatParam(value)}`).join('\n').concat('\n')

/**
 * Apakah jawaban server berarti "backend belum bisa membaca parameter"?
 * Server lama menolak jenis permintaan yang tidak dikenalnya, bridge lama juga. Kesalahan lain (mis. tidak ada kendaraan) bukan ini.
 */
export const isAddonMissing = (reply) => !reply.ok && /^(Invalid request: param\.list|Unknown request type)/.test(reply.text ?? '')
