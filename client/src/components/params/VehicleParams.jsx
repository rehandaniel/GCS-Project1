import { useEffect, useState } from 'react'
import { filterParams, formatParam, groupParams, toParamFile } from '../../lib/params.js'
import { readParams } from '../../state/params.js'
import { useStore } from '../../state/store.js'
import { Icon } from '../ui/Icon.jsx'

const download = (name, text) => {
  const link = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([text])), download: name })
  link.click()
  URL.revokeObjectURL(link.href)
}

/** Detik yang sudah berlalu selama `running`, untuk menunjukkan bahwa pembacaan masih berjalan. */
function useElapsed(running) {
  const [seconds, setSeconds] = useState(0)
  useEffect(() => {
    if (!running) return
    setSeconds(0)
    const timer = setInterval(() => setSeconds((now) => now + 1), 1000)
    return () => clearInterval(timer)
  }, [running])
  return seconds
}

/** Parameter autopilot (hanya baca). Alurnya: tombol -> state/params.js -> server -> bridge -> kendaraan, lalu daftarnya kembali ke sini. */
export default function VehicleParams({ query }) {
  const { status, items, text, readAt } = useStore((s) => s.params)
  const connected = useStore((s) => s.t.link === 'connected')
  const elapsed = useElapsed(status === 'loading')
  const shown = filterParams(items, query)

  if (status === 'loading') {
    return (
      <div className="notice" role="status">
        <progress aria-label="Reading parameters" />
        <h3>Reading parameters from the vehicle… {elapsed} s</h3>
        <p className="muted">A full list has more than a thousand entries. Over a telemetry radio this can take a minute or two.</p>
      </div>
    )
  }

  if (status === 'missing') {
    return (
      <div className="notice">
        <h3>This backend cannot read vehicle parameters yet</h3>
        <p className="muted">Live data works without it. To read the settings stored in the autopilot, install the optional parameter add-on (the tambahan-parameter folder) on the server and the bridge, restart both, then try again.</p>
        <button onClick={() => readParams()}><Icon name="refresh" size={16} />Try again</button>
      </div>
    )
  }

  if (status !== 'ready') {
    return (
      <div className="notice">
        {status === 'error' && <p role="alert" className="alert bad"><Icon name="warning" size={18} />{text}</p>}
        <h3>{connected ? 'Parameters have not been read yet' : 'Connect a vehicle first'}</h3>
        <p className="muted">Reading asks the autopilot for its whole list of settings. Nothing on the vehicle is changed.</p>
        <button className="primary" disabled={!connected} onClick={() => readParams()}><Icon name="download" size={16} />Read from vehicle</button>
      </div>
    )
  }

  return (
    <>
      <p className="toolbar">
        <span className="badge">{shown.length === items.length ? `${items.length} parameters` : `${shown.length} of ${items.length} parameters`}</span>
        <span className="muted">Read at {new Date(readAt).toLocaleTimeString('en-GB')}</span>
        <button disabled={!connected} onClick={() => readParams()}><Icon name="refresh" size={16} />Read again</button>
        <button onClick={() => download('vehicle.param', toParamFile(items))}><Icon name="save" size={16} />Save as .param file</button>
      </p>
      {shown.length === 0 && <p className="empty">No parameter matches “{query}”.</p>}
      <div className="param-groups">
        {groupParams(shown).map(([group, list]) => (
          <article key={group}>
            <h3>{group} <small>{list.length}</small></h3>
            <dl>
              {list.map(({ name, value }) => (
                <div key={name}>
                  <dt>{name}</dt>
                  <dd>{formatParam(value)}</dd>
                </div>
              ))}
            </dl>
          </article>
        ))}
      </div>
    </>
  )
}
