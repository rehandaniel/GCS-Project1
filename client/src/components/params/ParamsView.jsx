import { useState } from 'react'
import { Icon } from '../ui/Icon.jsx'
import LiveData from './LiveData.jsx'
import VehicleParams from './VehicleParams.jsx'

// Dua tab: angka telemetri yang terus berubah, dan parameter (setelan) yang tersimpan di dalam autopilot.
const TABS = [
  { id: 'live', label: 'Live data', hint: 'Every value the vehicle is sending right now.', Body: LiveData, find: 'Search live data, for example battery' },
  { id: 'vehicle', label: 'Vehicle parameters', hint: 'Settings stored inside the autopilot. Shown here for reading only.', Body: VehicleParams, find: 'Search parameters, for example ATC or BATT' },
]

/** Halaman Parameters. Kotak pencarian dipakai bersama oleh kedua tab. */
export default function ParamsView() {
  const [tab, setTab] = useState('live')
  const [query, setQuery] = useState('')
  const { hint, Body, find } = TABS.find(({ id }) => id === tab)

  return (
    <section className="page params">
      <header>
        <nav className="tabs" aria-label="Parameter kind">
          {TABS.map(({ id, label }) => (
            <button key={id} aria-pressed={tab === id} onClick={() => setTab(id)}>{label}</button>
          ))}
        </nav>
        <label className="search">
          <Icon name="search" size={16} />
          <input type="search" aria-label={find} placeholder={find} value={query} onChange={(e) => setQuery(e.target.value)} />
        </label>
      </header>
      <p className="muted">{hint}</p>
      <Body query={query} />
    </section>
  )
}
