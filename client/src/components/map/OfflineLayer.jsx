import L from 'leaflet'
import { useEffect } from 'react'
import { useMap } from 'react-leaflet'
import { PAPER, paintTile } from '../../lib/offlinePaint.js'
import { offlineAreas } from '../../state/offline.js'
import { useStore } from '../../state/store.js'
import { useTheme } from '../../state/theme.js'

const TILE = 256

// Lapisan Leaflet yang ubinnya kita gambar sendiri: Leaflet memanggil createTile untuk tiap kotak peta yang terlihat.
const OfflineGrid = L.GridLayer.extend({
  createTile(coords) {
    const canvas = document.createElement('canvas')
    const sharp = window.devicePixelRatio || 1 // layar retina: canvas dibuat lebih rapat supaya garis tetap tajam
    canvas.width = canvas.height = TILE * sharp
    const ctx = canvas.getContext('2d')
    ctx.scale(sharp, sharp)
    paintTile(ctx, coords, offlineAreas(), PAPER[this.options.theme], TILE)
    return canvas
  },
})

/** Peta offline: digambar dari data OpenStreetMap yang tersimpan di browser, mengikuti tema terang/gelap. */
export default function OfflineLayer() {
  const map = useMap()
  const theme = useTheme()
  const objects = useStore((s) => s.offline.objects) // berubah saat area disimpan atau dihapus -> gambar ulang

  useEffect(() => {
    const layer = new OfflineGrid({ theme, tileSize: TILE, maxZoom: 20 }).addTo(map)
    return () => layer.remove()
  }, [map, theme, objects])

  return null
}
