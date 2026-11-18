import { useEffect, useRef, useState } from 'react'
import { notify } from '../../state/events.js'
import { rpc, run } from '../../state/socket.js'
import { useStore } from '../../state/store.js'
import { Icon } from '../ui/Icon.jsx'

// Contoh alamat untuk tiap jenis sambungan. Nama port berbeda di tiap komputer: yang benar ada di daftar "Ports on this computer".
const PRESETS = [
  ['USB cable', 'serial:/dev/ttyACM0:115200'],
  ['Telemetry radio', 'serial:/dev/ttyUSB0:57600'],
  ['UDP 14550', 'udpin:0.0.0.0:14550'],
  ['TCP 5760', 'tcp:127.0.0.1:5760'],
]
const BAUDS = [57600, 115200, 230400, 460800, 921600]

/** Dialog sambungan: pilih atau ketik alamat kendaraan, lalu bridge yang membuka port-nya. */
export default function LinkDialog({ open, onClose }) {
  const dialog = useRef(null)
  const t = useStore((s) => s.t)
  const [connection, setConnection] = useState('')
  const [baud, setBaud] = useState(57600)
  const [ports, setPorts] = useState([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('') // ditampilkan di dalam dialog, karena toast tertutup latar dialog

  const scan = async () => {
    const reply = await rpc({ type: 'link.ports' })
    setPorts(reply.ok ? reply.data.ports : [])
  }

  // <dialog> bawaan browser: showModal() memberi latar gelap, fokus terkurung, dan Esc untuk menutup.
  useEffect(() => {
    const el = dialog.current
    if (open && !el.open) {
      el.showModal()
      scan()
    }
    if (!open && el.open) el.close()
  }, [open])

  const connect = async (event) => {
    event.preventDefault()
    setBusy(true)
    setError('')
    const reply = await rpc({ type: 'link.connect', connection: connection.trim() })
    setBusy(false)
    if (!reply.ok) return setError(reply.text)
    notify(reply.text)
    onClose()
  }

  return (
    <dialog ref={dialog} onClose={onClose} aria-labelledby="link-title">
      <form onSubmit={connect}>
        <h2 id="link-title">Connect to vehicle</h2>
        <p className="muted">Now: {t.link}{t.connection ? `, ${t.connection}` : ''}</p>

        <label>
          Connection address
          <input value={connection} onChange={(e) => setConnection(e.target.value)} placeholder="serial:/dev/ttyUSB0:57600" required autoComplete="off" spellCheck="false" />
        </label>
        <p className="presets">
          {PRESETS.map(([label, value]) => <button type="button" key={label} onClick={() => setConnection(value)}>{label}</button>)}
        </p>

        <fieldset>
          <legend>Ports on this computer</legend>
          <label>Baud <select value={baud} onChange={(e) => setBaud(Number(e.target.value))}>{BAUDS.map((rate) => <option key={rate}>{rate}</option>)}</select></label>
          <button type="button" onClick={scan}>Rescan</button>
          <p className="presets">
            {ports.length === 0 && <small>No serial ports found (or the bridge is offline).</small>}
            {ports.map(({ device, description }) => (
              <button type="button" key={device} title={description} onClick={() => setConnection(`serial:${device}:${baud}`)}>{device}</button>
            ))}
          </p>
        </fieldset>

        {error && <p role="alert" className="alert bad"><Icon name="warning" size={18} />{error}</p>}

        <menu>
          <li><button type="button" onClick={onClose}>Close</button></li>
          <li><button type="button" className="danger" disabled={t.link === 'disconnected'} onClick={() => run({ type: 'link.disconnect' })}>Disconnect</button></li>
          <li><button className="primary" disabled={busy || !connection.trim()}>{busy ? 'Connecting…' : 'Connect'}</button></li>
        </menu>
      </form>
    </dialog>
  )
}
