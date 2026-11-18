import L from 'leaflet'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Marker, Polyline, Popup, useMap, useMapEvents } from 'react-leaflet'
import { useChase } from '../../hooks/useChase.js'
import { vehicleKind, vehiclePath } from '../../lib/vehicle.js'
import { run } from '../../state/socket.js'
import { store, useStore } from '../../state/store.js'

const homeIcon = L.divIcon({ className: '', html: '<span class="home">H</span>', iconSize: [28, 28] })

/** Penanda kendaraan: siluet sesuai jenisnya. `stale` = sambungan putus, posisi terakhir yang diketahui. */
const vehicleIcon = (kind, stale) =>
  L.divIcon({
    className: '',
    html: `<span class="veh${stale ? ' stale' : ''}"><svg viewBox="0 0 48 48" width="44" height="44"><path d="${vehiclePath(kind)}"/></svg></span>`,
    iconSize: [56, 56],
  })

/** Geser peta sedikit demi sedikit sampai `position` kembali di tengah. Dipanggil tiap frame, jadi gerakannya halus. */
function recenter(map, position) {
  const size = map.getSize()
  if (!size.x || !size.y) return // peta sedang disembunyikan (halaman Logs atau Params dibuka)
  const offset = map.latLngToContainerPoint(position).subtract(size.divideBy(2))
  if (Math.abs(offset.x) > size.x || Math.abs(offset.y) > size.y) return map.setView(position, map.getZoom(), { animate: false }) // sudah di luar layar: langsung pindah
  const step = offset.multiplyBy(0.2).round()
  if (step.x || step.y) map.panBy(step, { animate: false })
}

/** Penanda yang meluncur halus dari posisi lama ke posisi baru dan berputar mengikuti arah kendaraan. */
function VehicleMarker({ follow }) {
  const map = useMap()
  const marker = useRef(null)
  const zooming = useRef(false)
  const t = useStore((s) => s.t)
  const start = useRef([t.lat, t.lng]).current // posisi awal saja; setelah itu useChase yang menggerakkan penanda
  const kind = vehicleKind(t)
  const stale = t.link !== 'connected'
  const icon = useMemo(() => vehicleIcon(kind, stale), [kind, stale])

  useMapEvents({ zoomstart: () => (zooming.current = true), zoomend: () => (zooming.current = false) })

  useChase({ lat: t.lat, lng: t.lng, heading: t.heading }, ({ lat, lng, heading }) => {
    const element = marker.current?.getElement()
    if (!element || lat == null) return
    marker.current.setLatLng([lat, lng])
    element.firstChild.style.transform = `rotate(${heading}deg)`
    if (follow && !zooming.current) recenter(map, [lat, lng]) // saat peta sedang di-zoom, biarkan animasi zoom selesai dulu
  }, ['heading'])

  return <Marker ref={marker} position={start} icon={icon} pmIgnore interactive={false} zIndexOffset={1000} />
}

/** Klik peta -> popup "Fly here" (hanya di tampilan Fly). */
function GotoPopup() {
  const [target, setTarget] = useState(null)
  const connected = useStore((s) => s.t.link === 'connected')
  useMapEvents({ click: (e) => setTarget(e.latlng) })
  if (!target) return null

  const submit = (event) => {
    event.preventDefault()
    run({ type: 'command', name: 'goto', lat: target.lat, lng: target.lng, alt: Number(new FormData(event.currentTarget).get('alt')) })
    setTarget(null)
  }

  return (
    <Popup position={target} eventHandlers={{ remove: () => setTarget(null) }}>
      <form onSubmit={submit}>
        <strong>Fly to this point</strong>
        <small>{target.lat.toFixed(6)}, {target.lng.toFixed(6)}</small>
        <label>Altitude (m)<input name="alt" type="number" defaultValue="20" min="2" max="120" required /></label>
        <button className="primary" disabled={!connected}>Fly here</button>
      </form>
    </Popup>
  )
}

/** Semua yang berhubungan dengan kendaraan di peta: penanda, jejak terbang, titik home, dan "ikuti kendaraan". */
export default function VehicleLayer({ follow, onFollow, showTrack, goto }) {
  const map = useMap()
  const track = useStore((s) => s.track)
  const located = useStore((s) => s.t.lat != null && s.t.lng != null)
  const homeLat = useStore((s) => s.t.homeLat)
  const homeLng = useStore((s) => s.t.homeLng)

  useMapEvents({ dragstart: () => onFollow(false) }) // menggeser peta sendiri = berhenti mengikuti

  // Begitu posisi pertama diketahui, peta langsung ke sana. Setelah itu VehicleMarker yang menjaga kendaraan tetap di tengah.
  useEffect(() => {
    const { lat, lng } = store.get().t
    if (located) map.setView([lat, lng], 17, { animate: false })
  }, [map, located])

  return (
    <>
      {showTrack && <Polyline positions={track} className="track" pmIgnore interactive={false} />}
      {homeLat != null && <Marker position={[homeLat, homeLng]} icon={homeIcon} pmIgnore interactive={false} />}
      {located && <VehicleMarker follow={follow} />}
      {goto && <GotoPopup />}
    </>
  )
}
