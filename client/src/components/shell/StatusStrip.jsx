import { batteryTone, linkStatus } from '../../lib/status.js'
import { VEHICLES, vehicleKind } from '../../lib/vehicle.js'
import { useStore } from '../../state/store.js'
import { Icon } from '../ui/Icon.jsx'
import { VehicleIcon } from '../ui/VehicleIcon.jsx'
import Messages from './Messages.jsx'

const join = (...parts) => parts.filter(Boolean).join(', ')

/** Bilah status di atas: judul halaman, lima keadaan terpenting kendaraan, lonceng pesan, dan tombol sambungan. */
export default function StatusStrip({ title, onLink }) {
  const t = useStore((s) => s.t)
  const online = useStore((s) => s.online)
  const bridge = useStore((s) => s.bridge)
  const unread = useStore((s) => s.unread)
  const demo = useStore((s) => s.demo)
  const seen = Boolean(t.sysid) // sudah pernah ada heartbeat? sebelum itu belum ada yang bisa dilaporkan
  const kind = vehicleKind(t)
  const [linkText, linkTone] = linkStatus(online, bridge, t.link)

  // Satu baris per kotak status. `tone` (ok / warn / bad) mewarnai ikonnya; teksnya selalu ikut menjelaskan.
  const cells = [
    { icon: 'radio', label: 'Link', value: linkText, tone: linkTone },
    { icon: 'gauge', label: 'Mode', value: t.mode || '—' },
    { icon: 'shield', label: 'Motors', value: seen ? (t.armed ? 'Armed' : 'Disarmed') : '—', tone: seen ? (t.armed ? 'warn' : 'ok') : '' },
    { icon: 'satellite', label: 'GPS', value: seen ? join(t.gpsFixText, t.sats != null && `${t.sats} sats`) : '—', tone: seen ? (t.gpsFix >= 3 ? 'ok' : 'warn') : '' },
    { icon: 'battery', label: 'Battery', value: t.batteryPct == null ? '—' : join(`${t.batteryPct}%`, t.batteryVolt && `${t.batteryVolt.toFixed(1)} V`), tone: batteryTone(t.batteryPct) },
    t.recording && { icon: 'rec', label: 'Log', value: 'Recording', tone: 'bad' },
    demo && { icon: 'warning', label: 'Source', value: 'Demo data', tone: 'warn' },
  ].filter(Boolean)

  return (
    <header className="strip">
      <h1>{title}</h1>
      <ul className="status">
        {cells.map(({ icon, label, value, tone }) => (
          <li key={label} className={tone}>
            <Icon name={icon} size={18} />
            <span>
              <small>{label}</small>
              <strong>{value}</strong>
            </span>
          </li>
        ))}
      </ul>

      <button className="square bell" popoverTarget="messages" aria-label={unread ? `Messages, ${unread} unread` : 'Messages'}>
        <Icon name="bell" />
        {unread > 0 && <em>{unread}</em>}
      </button>
      <Messages />

      <button className="link-chip" onClick={onLink}>
        <span className="avatar"><VehicleIcon kind={kind} size={22} /></span>
        <span>
          <strong>{seen ? `${VEHICLES[kind].name} #${t.sysid}` : 'Connect'}</strong>
          <small>{t.connection || 'No vehicle yet'}</small>
        </span>
        <Icon name="chevron" size={16} />
      </button>
    </header>
  )
}
