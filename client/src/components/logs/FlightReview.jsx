import { useEffect, useMemo, useState } from 'react'
import { CircleMarker, MapContainer, Polyline } from 'react-leaflet'
import { BASES } from '../../lib/basemaps.js'
import { sampleAt, toSamples, trackOf } from '../../lib/flight.js'
import { formatDistance, formatDuration } from '../../lib/format.js'
import { vehicleKind } from '../../lib/vehicle.js'
import { api } from '../../state/api.js'
import { readPref } from '../../state/prefs.js'
import DataBar from '../fly/DataBar.jsx'
import Instruments from '../fly/Instruments.jsx'
import BaseLayer from '../map/BaseLayer.jsx'
import Credits from '../map/Credits.jsx'
import { Icon } from '../ui/Icon.jsx'

const TICK = 0.1 // detik nyata antar langkah pemutaran
const RATES = [1, 4, 16]

/** Putar ulang satu penerbangan dari database SQL: jejak di peta, instrumen dan angka telemetri pada waktu yang dipilih, dan pemutar. */
export default function FlightReview({ id, onClose }) {
  const [flight, setFlight] = useState(null)
  const [error, setError] = useState('')
  const [time, setTime] = useState(0) // detik sejak sampel pertama
  const [playing, setPlaying] = useState(false)
  const [rate, setRate] = useState(4)
  const base = BASES.find(({ name }) => name === readPref('gcs-basemap')) ?? BASES[0] // peta dasar yang sama dengan peta utama

  useEffect(() => {
    let current = true // jawaban untuk penerbangan sebelumnya diabaikan bila id sudah berganti
    api.flight(id).then(
      (detail) => current && setFlight({ ...detail, samples: toSamples(detail) }),
      (e) => current && setError(e.message),
    )
    return () => {
      current = false
    }
  }, [id])

  const end = flight?.samples.at(-1).t ?? 0
  const here = useMemo(() => flight && sampleAt(flight.samples, time), [flight, time])
  const track = useMemo(() => (flight ? trackOf(flight.samples) : []), [flight])
  const kind = vehicleKind({ type: flight?.vehicle.split(' ')[1] }) // "ArduPilot copter #1" -> kelompok "copter"

  useEffect(() => {
    if (!playing) return
    const timer = setInterval(() => setTime((now) => Math.min(end, now + TICK * rate)), TICK * 1000)
    return () => clearInterval(timer)
  }, [playing, rate, end])

  useEffect(() => {
    if (time >= end) setPlaying(false) // sampai di ujung: berhenti
  }, [time, end])

  const toggle = () => {
    if (!playing && time >= end) setTime(0) // putar lagi dari awal
    setPlaying(!playing)
  }

  return (
    <section className="review" aria-label="Flight replay">
      <header>
        <button onClick={onClose}><Icon name="back" size={16} />Back to logs</button>
        <h2>{flight?.logName ?? 'Flight replay'}</h2>
        {flight && (
          <p className="facts">
            <span className="badge">{flight.vehicle}</span>
            <span className="badge">{new Date(flight.startedAt).toLocaleString('en-GB')}</span>
            <span className="badge">{formatDuration(flight.duration)}</span>
            <span className="badge">{formatDistance(flight.distance)}</span>
            <span className="badge">max {flight.maxAlt.toFixed(0)} m</span>
            <span className="badge">max {flight.maxSpeed.toFixed(1)} m/s</span>
            <span className="badge">{flight.messages.toLocaleString('en-GB')} messages</span>
          </p>
        )}
      </header>

      {error && <p role="alert" className="alert bad"><Icon name="warning" size={18} />{error}</p>}
      {!flight && !error && <p className="muted">Loading flight…</p>}
      {flight && (
        <>
          <section className="map-panel" aria-label="Flight track">
            {track.length > 0 && (
              <MapContainer key={flight.id} bounds={track} boundsOptions={{ padding: [48, 48], maxZoom: 18 }} maxZoom={20} zoomControl={false} attributionControl={false} zoomAnimation={false} fadeAnimation={false} markerZoomAnimation={false}>
                <BaseLayer base={base} />
                <Polyline positions={track} className="track" interactive={false} />
                {here.lat != null && <CircleMarker center={[here.lat, here.lng]} radius={9} className="replay-dot" interactive={false} />}
              </MapContainer>
            )}
            <Instruments t={{ ...here, heading: here.yaw }} kind={kind} /> {/* rekaman menyimpan arah sebagai `yaw` */}
            <Credits credit={base.credit} />
          </section>
          <DataBar t={here} label="Telemetry at the selected time" />
          <footer className="transport">
            <button className="square" aria-label={playing ? 'Pause' : 'Play'} onClick={toggle}><Icon name={playing ? 'pause' : 'play'} /></button>
            <input
              type="range" aria-label="Flight time" min="0" max={end} step="any" value={time}
              aria-valuetext={`${formatDuration(time)} of ${formatDuration(end)}`}
              onChange={(e) => setTime(Number(e.target.value))}
            />
            <time>{formatDuration(time)} / {formatDuration(end)}</time>
            <select aria-label="Playback speed" value={rate} onChange={(e) => setRate(Number(e.target.value))}>
              {RATES.map((r) => <option key={r} value={r}>{r}×</option>)}
            </select>
          </footer>
        </>
      )}
    </section>
  )
}
