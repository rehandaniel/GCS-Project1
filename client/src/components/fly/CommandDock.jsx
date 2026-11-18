import { useState } from 'react'
import { run } from '../../state/socket.js'
import { useStore } from '../../state/store.js'
import ConfirmButton from '../ui/ConfirmButton.jsx'
import { Icon } from '../ui/Icon.jsx'

// Mode yang paling sering dipakai jadi tombol; sisanya (CIRCLE, DRIFT, SPORT, ...) ada di menu "More modes".
const COMMON = ['STABILIZE', 'ALT_HOLD', 'LOITER', 'GUIDED', 'AUTO', 'RTL', 'LAND', 'BRAKE', 'FBWA', 'CRUISE', 'MANUAL']

/** Satu tabel menentukan semua tombol aksi. `confirm` = harus diklik dua kali, `off` = tidak berlaku saat ini. */
const actions = ({ armed, type }, alt) => [
  armed ? { label: 'Disarm', icon: 'shield', request: { name: 'disarm' } } : { label: 'Arm', icon: 'shield', request: { name: 'arm' }, confirm: true },
  { label: 'Takeoff', icon: 'up', request: { name: 'takeoff', alt }, confirm: true, off: type !== 'copter' || !armed },
  { label: 'Hold', icon: 'pause', request: { name: 'pause' } },
  { label: 'Land', icon: 'down', request: { name: 'land' } },
  { label: 'RTL', icon: 'home', request: { name: 'rtl' } },
  { label: 'Start mission', icon: 'play', request: { name: 'auto' } },
]

/** Dok perintah di kiri bawah peta: ganti mode terbang (baris atas) dan aksi kendaraan (baris bawah). */
export default function CommandDock() {
  const t = useStore((s) => s.t)
  const [alt, setAlt] = useState(10)
  const connected = t.link === 'connected'
  const send = (request) => run({ type: 'command', ...request }) // semua tombol berakhir di sini: browser -> server -> bridge -> kendaraan
  const chips = COMMON.filter((name) => t.modes.includes(name))
  const more = t.modes.filter((name) => !COMMON.includes(name))

  return (
    <section className="panel dock" aria-label="Vehicle commands">
      {t.modes.length > 0 && (
        <nav className="modes" aria-label="Flight mode">
          <ul>
            {chips.map((name) => (
              <li key={name}>
                <button aria-pressed={name === t.mode} disabled={!connected} onClick={() => send({ name: 'mode', mode: name })}>{name}</button>
              </li>
            ))}
          </ul>
          {more.length > 0 && (
            <select aria-label="More flight modes" value={more.includes(t.mode) ? t.mode : ''} disabled={!connected} onChange={(e) => send({ name: 'mode', mode: e.target.value })}>
              <option value="" disabled>More…</option>
              {more.map((name) => <option key={name}>{name}</option>)}
            </select>
          )}
        </nav>
      )}

      <menu className="actions">
        {actions(t, alt).map(({ label, icon, request, confirm, off }) => (
          <li key={label}>
            <ConfirmButton confirm={Boolean(confirm)} disabled={!connected || off} confirmLabel={`Confirm ${label.toLowerCase()}?`} onConfirm={() => send(request)}>
              <Icon name={icon} size={16} />{label}
            </ConfirmButton>
            {label === 'Takeoff' && (
              <label>to <input type="number" aria-label="Takeoff altitude in metres" value={alt} min="2" max="120" onChange={(e) => setAlt(Number(e.target.value))} /> m</label>
            )}
          </li>
        ))}
      </menu>
    </section>
  )
}
