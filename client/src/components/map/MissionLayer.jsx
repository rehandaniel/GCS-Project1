import L from 'leaflet'
import { Marker, Polyline } from 'react-leaflet'
import { isPositional } from '../../lib/mission.js'
import { patchItem, selectItem } from '../../state/mission.js'
import { useStore } from '../../state/store.js'

// Ikon dibuat sekali per (nomor, keadaan) lalu dipakai ulang, supaya Leaflet tidak mengganti ikon ratusan marker setiap render.
const icons = new Map()
const waypointIcon = (n, state) => {
  const key = `${n}:${state}`
  if (!icons.has(key)) icons.set(key, L.divIcon({ className: '', html: `<span class="wp ${state}">${n}</span>`, iconSize: [28, 28] }))
  return icons.get(key)
}

/** Garis dan marker misi. Saat `editable`, marker bisa digeser dan dipilih; nomor marker = nomor item (sama dengan `wp` dari autopilot). */
export default function MissionLayer({ editable }) {
  const items = useStore((s) => s.mission.items)
  const selectedId = useStore((s) => s.selectedId)
  const current = useStore((s) => s.t.wp)
  const homeLat = useStore((s) => s.t.homeLat)
  const homeLng = useStore((s) => s.t.homeLng)

  const points = items.map((item, index) => ({ item, n: index + 1 })).filter(({ item }) => isPositional(item))
  const path = [...(homeLat == null ? [] : [[homeLat, homeLng]]), ...points.map(({ item }) => [item.lat, item.lng])]

  return (
    <>
      <Polyline positions={path} className="mission-line" pmIgnore interactive={false} />
      {points.map(({ item, n }) => (
        <Marker
          key={item.id}
          position={[item.lat, item.lng]}
          icon={waypointIcon(n, item.id === selectedId ? 'selected' : n === current ? 'current' : '')}
          draggable={editable}
          itemId={item.id}
          eventHandlers={{
            click: () => selectItem(item.id),
            dragend: (e) => patchItem(item.id, { lat: e.target.getLatLng().lat, lng: e.target.getLatLng().lng }),
          }}
        />
      ))}
    </>
  )
}
