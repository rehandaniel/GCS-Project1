import { COMMANDS, newItem } from '../../lib/mission.js'
import { moveItem, patchItem, removeItem, selectItem } from '../../state/mission.js'
import { Icon } from '../ui/Icon.jsx'

const number = (event) => Number(event.target.value) || 0

/** Satu baris misi: pilih perintah, ubah tinggi dan parameter (field-nya ditentukan tabel COMMANDS). */
export default function MissionItem({ item, index, selected, last }) {
  const spec = COMMANDS[item.cmd]
  const options = Object.entries(COMMANDS).filter(([, { position }]) => position === spec?.position) // WAYPOINT <-> ORBIT, tidak ke RTL
  const setParam = (slot, value) => patchItem(item.id, { params: item.params.map((current, i) => (i === slot ? value : current)) })

  return (
    <li aria-current={selected} onClick={() => selectItem(item.id)}>
      <b>{index + 1}</b>
      {spec ? (
        <select aria-label="Command" value={item.cmd} onChange={(e) => patchItem(item.id, newItem(e.target.value, item, item.alt || 20))}>
          {options.map(([cmd, { label }]) => <option key={cmd} value={cmd}>{label}</option>)}
        </select>
      ) : (
        <span>{item.cmd}</span> // perintah asing dari file/kendaraan: dipertahankan apa adanya
      )}
      <span className="tools">
        <button aria-label="Move up" disabled={index === 0} onClick={() => moveItem(item.id, -1)}><Icon name="chevron-up" size={16} /></button>
        <button aria-label="Move down" disabled={last} onClick={() => moveItem(item.id, 1)}><Icon name="chevron" size={16} /></button>
        <button aria-label="Remove" onClick={() => removeItem(item.id)}><Icon name="trash" size={16} /></button>
      </span>
      <span className="fields">
        {spec?.position && item.cmd !== 'LAND' && (
          <label>Alt <input type="number" value={item.alt} onChange={(e) => patchItem(item.id, { alt: number(e) })} /> m</label>
        )}
        {spec?.params.map(({ index: slot, label, unit, min, max }) => (
          <label key={slot}>{label} <input type="number" value={item.params[slot]} min={min} max={max} onChange={(e) => setParam(slot, number(e))} /> {unit}</label>
        ))}
      </span>
    </li>
  )
}
