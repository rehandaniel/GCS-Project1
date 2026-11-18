// Pilihan pengguna yang diingat browser (localStorage), mis. tema dan peta dasar.
// Di mode privat penyimpanan bisa ditolak: pilihan lalu hanya berlaku sampai halaman ditutup, aplikasi tetap jalan.

export const readPref = (key, fallback) => {
  try {
    return localStorage.getItem(key) ?? fallback
  } catch {
    return fallback
  }
}

export const writePref = (key, value) => {
  try {
    localStorage.setItem(key, value)
  } catch {
    // tidak bisa disimpan: abaikan
  }
}
