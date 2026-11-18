import { useEffect, useRef, useState } from 'react'
import { parseMissionFile, toPlan, toWaypoints } from '../../lib/files.js'
import { formatDistance, formatDuration } from '../../lib/format.js'
import { isPositional, newItem, stats } from '../../lib/mission.js'
import { api } from '../../state/api.js'
import { notify } from '../../state/events.js'
import { addItems, markSaved, missionItems, renameMission, setMission } from '../../state/mission.js'
import { run } from '../../state/socket.js'
import { store, useStore } from '../../state/store.js'
import ConfirmButton from '../ui/ConfirmButton.jsx'
import { Icon } from '../ui/Icon.jsx'
import MissionItem from './MissionItem.jsx'
import SurveyForm from './SurveyForm.jsx'

const download = (name, text) => {
  const link = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([text])), download: name })
  link.click()
  URL.revokeObjectURL(link.href)
}

/** Panel misi di tampilan Plan: daftar item, kirim/ambil dari kendaraan, simpan ke database, impor/ekspor file. */
export default function PlanPanel() {
  const { id, name, items } = useStore((s) => s.mission)
  const selectedId = useStore((s) => s.selectedId)
  const planAlt = useStore((s) => s.planAlt)
  const surveyArea = useStore((s) => s.surveyArea)
  const t = useStore((s) => s.t)
  const [saved, setSaved] = useState([])
  const fileInput = useRef(null)
  const connected = t.link === 'connected'
  const home = t.homeLat == null ? items.find(isPositional) : { lat: t.homeLat, lng: t.homeLng, alt: 0 }
  const summary = stats(items, { home })

  const refresh = () => api.missions().then(setSaved).catch(() => setSaved([])) // server tidak ada = perpustakaan kosong
  useEffect(() => void refresh(), [])

  /** Bungkus aksi async: error (mis. server mati) menjadi toast, bukan pesan error yang tak terlihat. */
  const guard = (action) => async (...args) => {
    try {
      await action(...args)
    } catch (error) {
      notify(error.message, 'bad')
    }
  }

  // ---- kendaraan ----
  const upload = () => (items.length ? run({ type: 'mission.upload', items: missionItems() }) : notify('The mission is empty.', 'warn'))
  const downloadFromVehicle = async () => {
    const reply = await run({ type: 'mission.download' })
    if (reply.ok) setMission({ name: 'From vehicle', items: reply.data.items })
  }

  // ---- database di server ----
  const save = guard(async () => {
    const body = { name: name.trim() || 'Untitled mission', items: missionItems() }
    const result = id ? await api.updateMission(id, body) : await api.createMission(body)
    markSaved(result.id)
    notify(`Saved "${result.name}"`)
    refresh()
  })
  const open = guard(async (missionId) => setMission(await api.mission(missionId)))
  const remove = guard(async () => {
    await api.deleteMission(id)
    setMission({})
    refresh()
  })

  // ---- file ----
  const importFile = guard(async (event) => {
    const [file] = event.target.files
    event.target.value = '' // supaya file yang sama bisa dipilih lagi
    if (file) setMission({ name: file.name.replace(/\.[^.]+$/, ''), items: parseMissionFile(await file.text()) })
  })

  return (
    <aside className="panel plan" aria-label="Mission">
      <header>
        <input aria-label="Mission name" value={name} onChange={(e) => renameMission(e.target.value)} />
        <p className="stats">
          <span className="badge">{summary.count} items</span>
          <span className="badge">{formatDistance(summary.distance)}</span>
          <span className="badge">{formatDuration(summary.duration)}</span>
        </p>
        <p className="new">
          <label className="muted">New waypoints at <input type="number" value={planAlt} min="2" max="120" onChange={(e) => store.set({ planAlt: Number(e.target.value) || 20 })} /> m</label>
          <button title="Add a return-to-launch step at the end" onClick={() => addItems([newItem('RTL')])}>+ RTL</button>
        </p>
      </header>

      {items.length ? (
        <ol>
          {items.map((item, index) => <MissionItem key={item.id} item={item} index={index} selected={item.id === selectedId} last={index === items.length - 1} />)}
        </ol>
      ) : (
        <p className="empty">Draw with the tools beside this panel: the marker adds one waypoint, the line adds a route, the polygon marks a survey area.</p>
      )}

      {surveyArea > 0 && <SurveyForm />}

      <footer>
        <menu aria-label="Vehicle">
          <li><button className="primary" disabled={!connected} onClick={upload}><Icon name="upload" size={16} />Upload</button></li>
          <li><button disabled={!connected} onClick={downloadFromVehicle}><Icon name="download" size={16} />Download</button></li>
          <li><ConfirmButton disabled={!connected} confirmLabel="Clear vehicle?" onConfirm={() => run({ type: 'mission.clear' })}>Clear on vehicle</ConfirmButton></li>
        </menu>
        <menu aria-label="Library">
          <li><button aria-label="Save to library" title="Save to library" onClick={save}><Icon name="save" size={16} /></button></li>
          <li className="grow">
            <select aria-label="Open saved mission" value={id ?? ''} onChange={(e) => open(e.target.value)}>
              <option value="" disabled>Open saved…</option>
              {saved.map((mission) => <option key={mission.id} value={mission.id}>{mission.name} ({mission.count})</option>)}
            </select>
          </li>
          <li><ConfirmButton disabled={!id} aria-label="Delete from library" title="Delete from library" confirmLabel="Delete?" onConfirm={remove}><Icon name="trash" size={16} /></ConfirmButton></li>
        </menu>
        <menu aria-label="Files">
          <li><button onClick={() => fileInput.current.click()}><Icon name="folder" size={16} />Import</button></li>
          <li><button disabled={!items.length} onClick={() => download(`${name}.plan`, toPlan(missionItems(), home))}>Export .plan</button></li>
          <li><button disabled={!items.length} onClick={() => download(`${name}.waypoints`, toWaypoints(missionItems(), home))}>Export .waypoints</button></li>
        </menu>
        <input ref={fileInput} type="file" accept=".plan,.waypoints,.txt,.json" hidden onChange={importFile} />
      </footer>
    </aside>
  )
}
