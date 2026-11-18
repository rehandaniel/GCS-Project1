import { BASES } from '../../lib/basemaps.js'
import { MAX_AREA_KM2 } from '../../lib/offline.js'
import { notify } from '../../state/events.js'
import { clearOffline, saveArea } from '../../state/offline.js'
import { useStore } from '../../state/store.js'
import ConfirmButton from '../ui/ConfirmButton.jsx'
import { Icon } from '../ui/Icon.jsx'

const TOGGLES = [
  { key: 'track', label: 'Flight track' },
  { key: 'mission', label: 'Mission' },
]

/** Menu Layers (dibuka dari tombol di kanan peta): pilih peta dasar, apa yang tampil, dan simpan area untuk dipakai tanpa internet. */
export default function LayersMenu({ map, base, onBase, show, onShow }) {
  const offline = useStore((s) => s.offline)

  const save = async () => {
    const view = map.getBounds()
    try {
      const { count, kept } = await saveArea([view.getSouth(), view.getWest(), view.getNorth(), view.getEast()])
      notify(`Saved ${count.toLocaleString('en-US')} map objects. Choose the Offline base map to use them.`)
      if (!kept) notify('This browser only keeps the offline map until the page is closed. Open the GCS through localhost to keep it.', 'warn')
    } catch (error) {
      notify(error.message, 'bad')
    }
  }

  return (
    <aside id="layers" className="menu layers" popover="auto" aria-label="Layers">
      <fieldset>
        <legend>Base map</legend>
        {BASES.map(({ name }) => (
          <label key={name}>
            <input type="radio" name="base" checked={name === base.name} onChange={() => onBase(name)} />
            {name}
          </label>
        ))}
      </fieldset>

      <fieldset>
        <legend>Show on the map</legend>
        {TOGGLES.map(({ key, label }) => (
          <label key={key}>
            <input type="checkbox" checked={show[key]} onChange={() => onShow({ ...show, [key]: !show[key] })} />
            {label}
          </label>
        ))}
      </fieldset>

      <fieldset>
        <legend>Offline map</legend>
        <p className="muted">
          {offline.areas
            ? `${offline.areas} saved ${offline.areas === 1 ? 'area' : 'areas'}, ${offline.objects.toLocaleString('en-US')} objects.`
            : `Nothing saved yet. Saving downloads the roads, buildings and water in view (up to ${MAX_AREA_KM2} km²), so the Offline map works without internet.`}
        </p>
        <p className="row">
          <button onClick={save} disabled={offline.busy}>
            <Icon name="download" size={16} />
            {offline.busy ? 'Downloading…' : 'Save this view'}
          </button>
          <ConfirmButton disabled={!offline.areas || offline.busy} confirmLabel="Delete all?" onConfirm={clearOffline}>Delete saved</ConfirmButton>
        </p>
      </fieldset>
    </aside>
  )
}
