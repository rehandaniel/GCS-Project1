import { useState } from 'react'
import { LiveDataBar } from './components/fly/DataBar.jsx'
import LogsView from './components/logs/LogsView.jsx'
import MapStage from './components/map/MapStage.jsx'
import ParamsView from './components/params/ParamsView.jsx'
import LinkDialog from './components/shell/LinkDialog.jsx'
import Rail from './components/shell/Rail.jsx'
import StatusStrip from './components/shell/StatusStrip.jsx'
import Toasts from './components/shell/Toasts.jsx'

const TITLES = { fly: 'Flight control', plan: 'Mission planner', logs: 'Flight logs', params: 'Parameters' }

/**
 * Kerangka aplikasi: menu di kiri, bilah status di atas, lalu satu halaman sesuai `view`.
 * Fly dan Plan memakai peta yang sama (MapStage), jadi peta hanya disembunyikan saat membuka Logs atau Parameters.
 */
export default function App() {
  const [view, setView] = useState('fly')
  const [linkOpen, setLinkOpen] = useState(false)
  const onMap = view === 'fly' || view === 'plan'

  return (
    <>
      <Rail view={view} onView={setView} />
      <div className="workspace">
        <StatusStrip title={TITLES[view]} onLink={() => setLinkOpen(true)} />
        <main>
          <MapStage view={view} hidden={!onMap} />
          {view === 'logs' && <LogsView />}
          {view === 'params' && <ParamsView />}
        </main>
        {view === 'fly' && <LiveDataBar />}
      </div>
      <LinkDialog open={linkOpen} onClose={() => setLinkOpen(false)} />
      <Toasts />
    </>
  )
}
