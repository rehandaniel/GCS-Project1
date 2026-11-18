import { newItem } from '../lib/mission.js'
import { area, surveyPath } from '../lib/survey.js'
import { store } from './store.js'

// Poligon survey adalah layer Geoman di peta (maksimal satu). Layer disimpan di sini, bukan di store,
// karena objek Leaflet bukan data biasa; yang masuk store hanya luasnya, supaya panel bisa menampilkannya.
let layer = null

const polygon = () => layer?.getLatLngs()[0].map(({ lat, lng }) => ({ lat, lng })) ?? []
const publish = () => store.set({ surveyArea: layer ? Math.round(area(polygon())) : 0 })

export const setSurveyLayer = (next) => {
  layer?.remove()
  layer = next
  if (layer) {
    layer.pm.enable({ allowSelfIntersection: false }) // titik sudut langsung bisa digeser
    layer.on('pm:edit', publish)
  }
  publish()
}

export const clearSurvey = () => setSurveyLayer(null)

// Dipanggil saat Geoman menghapus layer: lupakan poligon bila itu poligon survey. 
export const forgetSurveyLayer = (removed) => {
  if (removed !== layer) return false
  layer = null
  publish()
  return true
}

// Waypoint hasil survey untuk poligon yang sedang digambar. */
export const surveyWaypoints = ({ spacing, heading, alt }) => surveyPath(polygon(), { spacing, heading }).map((point) => newItem('WAYPOINT', point, alt))