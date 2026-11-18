import { MAX_ITEMS } from '../../lib/mission.js'
import { notify } from '../../state/events.js'
import { addItems } from '../../state/mission.js'
import { store, useStore } from '../../state/store.js'
import { clearSurvey, surveyWaypoints } from '../../state/survey.js'

/** Muncul setelah poligon digambar dengan alat gambar: ubah area menjadi jalur zig-zag waypoint. */
export default function SurveyForm() {
  const area = useStore((s) => s.surveyArea)
  const alt = useStore((s) => s.planAlt)

  const submit = (event) => {
    event.preventDefault()
    const form = Object.fromEntries(new FormData(event.currentTarget))
    const items = surveyWaypoints({ spacing: Number(form.spacing), heading: Number(form.heading), alt: Number(form.alt) })
    if (!items.length) return notify('No flight lines fit in this area. Try a smaller spacing.', 'warn')
    if (store.get().mission.items.length + items.length > MAX_ITEMS) return notify(`A mission can have at most ${MAX_ITEMS} items.`, 'bad')
    addItems(items)
    clearSurvey()
  }

  return (
    <form className="survey" onSubmit={submit}>
      <fieldset>
        <legend>Survey area, {(area / 10_000).toFixed(2)} ha</legend>
        <label>Spacing <input name="spacing" type="number" defaultValue="20" min="2" max="500" /> m</label>
        <label>Heading <input name="heading" type="number" defaultValue="0" min="0" max="359" /> °</label>
        <label>Alt <input name="alt" type="number" defaultValue={alt} min="2" max="120" /> m</label>
        <button className="primary">Generate</button>
        <button type="button" onClick={clearSurvey}>Cancel</button>
      </fieldset>
    </form>
  )
}
