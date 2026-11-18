import { useEffect, useRef, useState } from 'react'
import { mergeLogs } from '../../lib/flight.js'
import { formatBytes, formatDistance, formatDuration } from '../../lib/format.js'
import { api } from '../../state/api.js'
import { run } from '../../state/socket.js'
import { useStore } from '../../state/store.js'
import ConfirmButton from '../ui/ConfirmButton.jsx'
import { Icon } from '../ui/Icon.jsx'
import FlightReview from './FlightReview.jsx'

/** File .tlog di folder log digabung dengan penerbangan di database SQL. "Open" membaca log ke database (bila belum) lalu memutarnya ulang. */
export default function LogsView() {
  const recording = useStore((s) => s.t.recording)
  const connected = useStore((s) => s.t.link === 'connected')
  const [rows, setRows] = useState([])
  const [loadError, setLoadError] = useState('')
  const [actionError, setActionError] = useState('')
  const [busy, setBusy] = useState('') // nama log yang sedang dibaca atau diunggah
  const [opened, setOpened] = useState(null) // id penerbangan yang sedang diputar ulang
  const picker = useRef(null)

  const load = () =>
    Promise.all([api.logs(), api.flights()])
      .then(([files, flights]) => (setRows(mergeLogs(files, flights)), setLoadError('')))
      .catch((e) => setLoadError(e.message))

  useEffect(() => {
    load()
    const timer = setInterval(load, 5000)
    return () => clearInterval(timer)
  }, [])

  /** Jalankan satu aksi untuk satu log: tandai sibuk, tampilkan galatnya, lalu segarkan daftar. */
  const attempt = async (name, work) => {
    setBusy(name)
    setActionError('')
    try {
      await work()
    } catch (e) {
      setActionError(e.message)
    } finally {
      setBusy('')
      load()
    }
  }

  const open = (name, flight) => attempt(name, async () => setOpened((flight ?? (await api.importFlight(name))).id))
  const reread = (name) => attempt(name, () => api.importFlight(name))
  const forget = ({ id, logName }) => attempt(logName, () => api.deleteFlight(id))
  const openFile = (event) => {
    const [file] = event.target.files
    event.target.value = '' // supaya file yang sama bisa dipilih lagi
    if (!file) return
    attempt(file.name, async () => {
      const { name } = await api.uploadLog(file)
      setOpened((await api.importFlight(name)).id)
    })
  }
  const toggle = async () => {
    await run({ type: recording ? 'log.stop' : 'log.start' })
    load()
  }

  if (opened) return <FlightReview id={opened} onClose={() => setOpened(null)} />

  const problem = actionError || loadError
  return (
    <section className="page logs">
      <header>
        <h2>Recordings</h2>
        <input ref={picker} type="file" accept=".tlog" hidden onChange={openFile} />
        <button disabled={Boolean(busy)} onClick={() => picker.current.click()}>
          <Icon name="upload" size={16} />Open .tlog file…
        </button>
        <button className={recording ? 'danger' : ''} disabled={!connected} onClick={toggle}>
          <Icon name={recording ? 'stop' : 'rec'} size={16} />{recording ? 'Stop recording' : 'Start recording'}
        </button>
      </header>

      {problem && <p role="alert" className="alert bad"><Icon name="warning" size={18} />{problem}</p>}
      <table>
        <thead><tr><th>File</th><th>Size</th><th>Saved</th><th>Database</th><th><span className="sr">Actions</span></th></tr></thead>
        <tbody>
          {rows.map(({ name, size, modifiedAt, flight }) => (
            <tr key={name}>
              <td>{name}</td>
              <td>{size == null ? '—' : formatBytes(size)}</td>
              <td>{new Date(modifiedAt).toLocaleString('en-GB')}</td>
              <td>
                {flight ? (
                  <>
                    <span className="badge ok"><Icon name="check" size={12} />In database</span>{' '}
                    <small>{formatDuration(flight.duration)}, {formatDistance(flight.distance)}</small>
                  </>
                ) : (
                  <span className="badge">Not imported</span>
                )}
              </td>
              <td>
                <div className="row-actions">
                  <button className="primary" disabled={Boolean(busy)} onClick={() => open(name, flight)}>
                    <Icon name="play" size={16} />{busy === name ? 'Reading…' : 'Open'}
                  </button>
                  {flight && size != null && (
                    <button title="Read the file into the database again" aria-label={`Read ${name} again`} disabled={Boolean(busy)} onClick={() => reread(name)}>
                      <Icon name="refresh" size={16} />
                    </button>
                  )}
                  {size != null && <a className="button" href={`/api/logs/${name}`} download><Icon name="download" size={16} />Download</a>}
                  {flight && (
                    <ConfirmButton disabled={Boolean(busy)} confirmLabel="Remove?" aria-label={`Remove ${name} from the database`} title="Remove from the database (the file stays)" onConfirm={() => forget(flight)}>
                      <Icon name="trash" size={16} />
                    </ConfirmButton>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {!rows.length && !loadError && <p className="muted">No recordings yet. Recording starts automatically on arm, or press the button above. A .tlog from another GCS can be opened too.</p>}
    </section>
  )
}
