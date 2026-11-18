import { formatField, searchFields } from '../../lib/telemetry.js'
import { useStore } from '../../state/store.js'

/** Semua angka telemetri dari kendaraan, dikelompokkan. Tabelnya ada di lib/telemetry.js; frame-nya dikirim bridge 5 kali per detik. */
export default function LiveData({ query }) {
  const t = useStore((s) => s.t)
  const groups = searchFields(query)
  if (!groups.length) return <p className="empty">No live value matches “{query}”.</p>

  return (
    <div className="live-grid">
      {groups.map(({ title, fields }) => (
        <article key={title}>
          <h3>{title}</h3>
          <dl>
            {fields.map((field) => {
              const text = formatField(t, field)
              return (
                <div key={field.key} title={`Field name: ${field.key}`}>
                  <dt>{field.label}</dt>
                  <dd>{text}{text !== '—' && field.unit && <small>{field.unit}</small>}</dd>
                </div>
              )
            })}
          </dl>
        </article>
      ))}
    </div>
  )
}
