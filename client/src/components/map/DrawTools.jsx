import L from 'leaflet' // harus dimuat sebelum Geoman: Geoman membaca window.L
import '@geoman-io/leaflet-geoman-free'
import { useEffect } from 'react'
import { useMap } from 'react-leaflet'
import { newItem } from '../../lib/mission.js'
import { addItems, removeItem } from '../../state/mission.js'
import { store } from '../../state/store.js'
import { forgetSurveyLayer, setSurveyLayer } from '../../state/survey.js'

// Alat gambar di tampilan Plan, dari pustaka Geoman. Hanya alat gambar + hapus yang dipakai. Alat edit/geser dimatikan karena
// marker waypoint sudah bisa digeser langsung, dan poligon survey diedit lewat layer.pm.enable() (lihat state/survey.js).
const CONTROLS = {
  position: 'topleft',
  drawMarker: true, drawPolyline: true, drawPolygon: true, removalMode: true,
  drawRectangle: false, drawCircle: false, drawCircleMarker: false, drawText: false,
  editMode: false, dragMode: false, cutPolygon: false, rotateMode: false,
}

// Marker bayangan yang mengikuti kursor memakai ikon sendiri (ikon bawaan Leaflet butuh file gambar yang tidak ikut ter-bundle).
const DRAFT_ICON = L.divIcon({ className: '', html: '<span class="wp draft">+</span>', iconSize: [28, 28] })

/** Tiap bentuk yang selesai digambar diubah menjadi data: marker/garis -> waypoint, poligon -> area survey. */
const onCreate = ({ shape, layer }) => {
  const alt = store.get().planAlt
  if (shape === 'Marker') addItems([newItem('WAYPOINT', layer.getLatLng(), alt)])
  else if (shape === 'Line') addItems(layer.getLatLngs().map((point) => newItem('WAYPOINT', point, alt)))
  if (shape === 'Polygon') return setSurveyLayer(layer)
  layer.remove() // layer gambar Geoman dibuang; yang tampil adalah marker milik MissionLayer
}

const onRemove = ({ layer }) => {
  if (!forgetSurveyLayer(layer) && layer.options.itemId) removeItem(layer.options.itemId)
}

export default function DrawTools() {
  const map = useMap()

  useEffect(() => {
    map.pm.setGlobalOptions({ snappable: false, continueDrawing: true, markerStyle: { icon: DRAFT_ICON }, pathOptions: { className: 'survey-area' } })
    map.pm.addControls(CONTROLS)
    map.on('pm:create', onCreate)
    map.on('pm:remove', onRemove)
    return () => {
      map.off('pm:create', onCreate)
      map.off('pm:remove', onRemove)
      map.pm.disableDraw()
      map.pm.disableGlobalRemovalMode()
      map.pm.removeControls()
    }
  }, [map])

  return null
}
