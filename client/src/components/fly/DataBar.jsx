import { BAR_GROUPS, formatField } from '../../lib/telemetry.js'
import { useStore } from '../../state/store.js'
import { Icon } from '../ui/Icon.jsx'

/** Bilah angka telemetri: posisi, attitude (roll/pitch/yaw), dan kecepatan. `t` = frame dari kendaraan atau sampel dari log. */
export default function DataBar({ t, stale = false, label = 'Telemetry' }) {
  return (
    <section className="databar" aria-label={label} data-stale={stale || undefined}>
      {BAR_GROUPS.map(({ title, fields }) => (
        <article key={title}>
          <h3>{title}</h3>
          <dl>
            {fields.map((field) => {
              const text = formatField(t, field) // belum ada data tampil sebagai "—", bukan 0
              return (
                <div key={field.key} className={field.wide ? 'wide' : undefined}>
                  <dt>{field.short ?? field.label}</dt>
                  <dd>{text}{text !== '—' && <small>{field.unit}</small>}</dd>
                </div>
              )
            })}
          </dl>
        </article>
      ))}
      {stale && <span className="badge warn"><Icon name="warning" size={12} />Last known</span>}
    </section>
  )
}

const NOTHING = {}

/** Telemetri langsung. Sebelum heartbeat pertama semua "—"; bila link putus, angka terakhir tetap tampil (diberi tanda). */
export function LiveDataBar() {
  const t = useStore((s) => s.t)
  const seen = Boolean(t.sysid) // 0 atau null = belum ada heartbeat
  return <DataBar t={seen ? t : NOTHING} stale={seen && t.link !== 'connected'} label="Live telemetry" />
}
