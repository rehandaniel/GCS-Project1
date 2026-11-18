import { formatDistance, formatDuration } from '../../lib/format.js'
import { clamp } from '../../lib/geo.js'
import { batteryTone, speedLevel, warningFor } from '../../lib/status.js'
import { VEHICLES, vehicleKind } from '../../lib/vehicle.js'
import { useStore } from '../../state/store.js'
import { Icon } from '../ui/Icon.jsx'
import { VehicleIcon } from '../ui/VehicleIcon.jsx'
import { LiquidGauge, SpeedGauge } from './Gauges.jsx'

const SPEED_MAX = { fast: 35, slow: 20 } // batas gauge (m/s): pesawat bersayap lebih cepat dari drone

const Badge = ({ tone, icon, children }) => (
  <span className={`badge ${tone}`}>{icon && <Icon name={icon} size={12} />}{children}</span>
)

/** Kartu kendaraan melayang di kiri atas peta: jenis, kemajuan misi, kecepatan, baterai, dan satu peringatan terpenting. */
export default function VehicleCard() {
  const t = useStore((s) => s.t)
  const total = useStore((s) => s.mission.items.length)
  const connected = t.link === 'connected'
  const kind = vehicleKind(t)
  const ratio = t.groundSpeed / (VEHICLES[kind].fast ? SPEED_MAX.fast : SPEED_MAX.slow)
  const [speedText, speedTone] = speedLevel(ratio)
  const progress = total ? clamp((Math.max(t.wp, 1) - 1) / total, 0, 1) : 0
  const eta = t.groundSpeed > 0.5 ? formatDuration(t.wpDist / t.groundSpeed) : '--:--'
  const [warnTone, warnText] = warningFor(t) ?? []

  return (
    <article className="panel vehicle">
      <header>
        <span className="avatar"><VehicleIcon kind={kind} size={30} /></span>
        <div>
          <h2>{t.sysid ? `${VEHICLES[kind].name} #${t.sysid}` : 'No vehicle'}</h2>
          <p>{[t.autopilot, t.firmware].filter(Boolean).join(' ') || 'Waiting for heartbeat'}</p>
        </div>
        {connected && <Badge tone={t.armed ? 'warn' : 'ok'} icon={t.armed ? 'warning' : 'check'}>{t.armed ? 'Armed' : 'Disarmed'}</Badge>}
      </header>

      <section className="route" aria-label="Mission progress">
        <p><span>Home</span><span>{total ? `WP ${Math.max(t.wp, 1)} of ${total}` : 'No mission loaded'}</span></p>
        <p><strong>{t.homeDist == null ? '—' : formatDistance(t.homeDist)} <small>from home</small></strong><span>{Math.round(progress * 100)}%</span></p>
        <progress value={progress} max="1" aria-label="Mission progress" />
        <p><span>ETA {eta}</span><span>{total && connected ? `${formatDistance(t.wpDist)} to waypoint` : '—'}</span></p>
      </section>

      <section className="tiles">
        <article className="tile">
          <header><span>Speed</span>{connected && <Badge tone={speedTone} icon={speedTone === 'bad' ? 'warning' : null}>{speedText}</Badge>}</header>
          <SpeedGauge ratio={ratio} />
          <strong>{t.groundSpeed.toFixed(1)} <small>m/s</small></strong>
        </article>
        <article className="tile">
          <header><span>Battery</span>{t.batteryVolt && <Badge tone="">{t.batteryVolt.toFixed(1)} V</Badge>}</header>
          <LiquidGauge pct={t.batteryPct} tone={batteryTone(t.batteryPct)} />
          <strong>{t.relAlt.toFixed(0)} <small>m above home</small></strong>
        </article>
      </section>

      {warnText && (
        <p className={`alert ${warnTone}`} role="alert">
          <Icon name="warning" size={18} />{warnText}
        </p>
      )}
    </article>
  )
}
