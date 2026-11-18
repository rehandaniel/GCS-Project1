const OSM = ['© OpenStreetMap', 'https://www.openstreetmap.org/copyright']

// Sejak akhir Agustus 2026 ubin CARTO wajib memakai key (gratis, dikirim lewat email: carto.com/basemaps/apikey).
// Simpan di client/.env sebagai VITE_CARTO_KEY=... (file .env diabaikan Git). Tanpa key, peta Dark disembunyikan.
const CARTO_KEY = import.meta.env.VITE_CARTO_KEY

/**
 * Peta dasar yang bisa dipilih. `credit` = atribusi yang wajib tampil. Dipakai peta utama dan putar ulang log.
 * Tiga yang pertama berupa ubin gambar dari internet. `offline: true` berarti digambar sendiri dari data yang tersimpan di browser.
 */
export const BASES = [
  CARTO_KEY && { name: 'Dark', url: `https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png?key=${CARTO_KEY}`, subdomains: 'abcd', maxZoom: 20, credit: [OSM, ['© CARTO', 'https://carto.com/attributions']] },
  { name: 'Street', url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png', subdomains: 'abc', maxZoom: 19, credit: [OSM] },
  { name: 'Satellite', url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', subdomains: 'abc', maxZoom: 19, credit: [['Imagery © Esri', 'https://www.esri.com']] },
  { name: 'Offline', offline: true, credit: [OSM] },
].filter(Boolean)
