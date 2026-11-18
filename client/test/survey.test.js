import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { destination, distance } from '../src/lib/geo.js'
import { area, surveyPath } from '../src/lib/survey.js'

const origin = { lat: -7.77069, lng: 110.37786 }
// kotak 200 m (timur-barat) x 100 m (utara-selatan)
const west = origin
const east = destination(origin, 90, 200)
const rectangle = [west, east, destination(east, 0, 100), destination(west, 0, 100)]
describe('survey', () => {
  test('area kotak 200 x 100 m ≈ 20.000 m²', () => {
    assert.ok(Math.abs(area(rectangle) - 20_000) < 20)
    assert.equal(area(rectangle.slice(0, 2)), 0)
  })

  test('jalur utara-selatan: jumlah jalur, panjang tiap jalur, dan arah bolak-balik', () => {
    const path = surveyPath(rectangle, { spacing: 20, heading: 0 })
    assert.equal(path.length, 20) // 10 jalur x 2 titik: 200 m / 20 m, tiap jalur di tengah strip 20 m
    for (let i = 0; i < path.length; i += 2) assert.ok(Math.abs(distance(path[i], path[i + 1]) - 100) < 0.5)
    assert.ok(path[1].lat > path[0].lat) // jalur pertama ke utara
    assert.ok(path[3].lat < path[2].lat) // jalur kedua balik ke selatan
  })

  test('jalur timur-barat memberi jalur lebih sedikit (100 m / 20 m = 5 jalur)', () => {
    const path = surveyPath(rectangle, { spacing: 20, heading: 90 })
    assert.equal(path.length, 10)
    for (let i = 0; i < path.length; i += 2) assert.ok(Math.abs(distance(path[i], path[i + 1]) - 200) < 0.5)
  })
  test('semua titik berada di dalam kotak pembatas poligon', () => {
    const lats = rectangle.map((p) => p.lat)
    const lngs = rectangle.map((p) => p.lng)
    const pad = 1e-6
    for (const p of surveyPath(rectangle, { spacing: 15, heading: 33 })) {
      assert.ok(p.lat >= Math.min(...lats) - pad && p.lat <= Math.max(...lats) + pad)
      assert.ok(p.lng >= Math.min(...lngs) - pad && p.lng <= Math.max(...lngs) + pad)
    }
  })

  test('poligon cekung (bentuk U): setiap jalur menghasilkan dua segmen', () => {
    const u = [[0, 0], [0, 90], [100, 90], [100, 60], [40, 60], [40, 30], [100, 30], [100, 0]].map(([north, east2]) => destination(destination(origin, 0, north), 90, east2))
    const path = surveyPath(u, { spacing: 10, heading: 90 })
    assert.ok(path.length > 0 && path.length % 2 === 0)
  })

  test('area lebih sempit dari jarak jalur tetap mendapat satu jalur di tengah', () => {
    const path = surveyPath(rectangle, { spacing: 500, heading: 0 })
    assert.equal(path.length, 2)
    assert.ok(Math.abs(distance(origin, path[0]) - Math.hypot(100, 0)) < 1) // 100 m dari sisi barat = tengah area
  })

  test('masukan tidak valid -> jalur kosong', () => {
    assert.deepEqual(surveyPath(rectangle.slice(0, 2)), [])
    assert.deepEqual(surveyPath(rectangle, { spacing: 0 }), [])
    assert.deepEqual(surveyPath([]), [])
  })
})