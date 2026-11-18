import { useEffect, useRef, useState } from 'react'
import { MapContainer } from 'react-leaflet'
import { BASES } from '../../lib/basemaps.js'
import { readPref, writePref } from '../../state/prefs.js'
import CommandDock from '../fly/CommandDock.jsx'
import { LiveInstruments } from '../fly/Instruments.jsx'
import VehicleCard from '../fly/VehicleCard.jsx'
import PlanPanel from '../plan/PlanPanel.jsx'
import BaseLayer from './BaseLayer.jsx'
import Credits from './Credits.jsx'
import DrawTools from './DrawTools.jsx'
import LayersMenu from './LayersMenu.jsx'
import MapControls from './MapControls.jsx'
import MissionLayer from './MissionLayer.jsx'
import VehicleLayer from './VehicleLayer.jsx'

const START = [-7.77069, 110.37786] // sebelum ada GPS, peta mulai di sini
const BASE_KEY = 'gcs-basemap'

/** Satu peta untuk Fly dan Plan: pindah tampilan tidak mengatur ulang posisi/zoom. Panel-panel melayang di atasnya. */
export default function MapStage({ view, hidden }) {
  const panel = useRef(null)
  const [map, setMap] = useState(null)
  const [baseName, setBaseName] = useState(() => readPref(BASE_KEY, BASES[0].name))
  const [follow, setFollow] = useState(true)
  const [show, setShow] = useState({ track: true, mission: true })
  const fly = view !== 'plan'
  const base = BASES.find(({ name }) => name === baseName) ?? BASES[0]

  // Halaman lain hanya menyembunyikan peta (`hidden`), tidak membuangnya: peta Leaflet yang dibuang saat animasi zoom berjalan memicu error di konsol.
  useEffect(() => {
    if (!hidden) map?.invalidateSize() // peta tersembunyi berukuran 0: hitung ulang saat tampil lagi
  }, [hidden, map])

  const chooseBase = (name) => {
    setBaseName(name)
    writePref(BASE_KEY, name) // diingat, supaya saat dibuka tanpa internet langsung memakai peta Offline
  }

  return (
    <section className="map-panel" ref={panel} aria-label="Map" hidden={hidden}>
      <MapContainer ref={setMap} center={START} zoom={16} maxZoom={20} zoomControl={false} attributionControl={false}>
        <BaseLayer base={base} />
        <VehicleLayer follow={follow} onFollow={setFollow} showTrack={show.track} goto={fly} />
        {(show.mission || !fly) && <MissionLayer editable={!fly} />}
        {!fly && <DrawTools />}
      </MapContainer>

      {map && <MapControls map={map} panel={panel} follow={follow} onFollow={setFollow} />}
      {map && <LayersMenu map={map} base={base} onBase={chooseBase} show={show} onShow={setShow} />}
      {fly ? (
        <div className="left">
          <VehicleCard />
          <CommandDock />
        </div>
      ) : (
        <PlanPanel />
      )}
      <LiveInstruments />
      <Credits credit={base.credit} />
    </section>
  )
}
