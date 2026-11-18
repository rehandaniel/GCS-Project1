import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { MAX_AREA_KM2, areaKm2, joinLines, kindOf, mercator, overlaps, overpassQuery, prepareArea, toFeatures } from '../src/lib/offline.js'
import { PAPER, paintTile } from '../src/lib/offlinePaint.js'

const BOUNDS = [-7.78, 110.37, -7.76, 110.39] // selatan, barat, utara, timur (sekitar UGM)
const point = (lat, lon) => ({ lat, lon })
const way = (tags, geometry) => ({ type: 'way', id: 1, nodes: [], geometry, tags })

// Jawaban Overpass tiruan dengan bentuk yang sama seperti aslinya (`out geom`).
const REPLY = {
  version: 0.6,
  elements: [
    way({ highway: 'primary', name: 'Jalan Kaliurang' }, [point(-7.775, 110.371), point(-7.765, 110.389)]),
    way({ highway: 'residential' }, [point(-7.77, 110.375), point(-7.77, 110.385)]),
    way({ highway: 'primary_link' }, [point(-7.771, 110.38), point(-7.772, 110.381)]),
    way({ highway: 'proposed' }, [point(-7.77, 110.38), point(-7.771, 110.38)]),
    way({ building: 'yes' }, [point(-7.77, 110.38), point(-7.77, 110.381), point(-7.771, 110.381), point(-7.771, 110.38), point(-7.77, 110.38)]),
    way({ natural: 'wood' }, [point(-7.765, 110.375), point(-7.765, 110.376), point(-7.766, 110.376), point(-7.765, 110.375)]),
    way({ aeroway: 'runway' }, [point(-7.775, 110.38), point(-7.775, 110.388)]),
    way({ waterway: 'river' }, [point(-7.762, 110.372), point(-7.768, 110.373)]),
    way({ amenity: 'school' }, [point(-7.77, 110.38), point(-7.771, 110.38)]),
    { type: 'node', id: 5, lat: -7.77, lon: 110.38, tags: { highway: 'crossing' } },
    {
      type: 'relation', id: 9, tags: { type: 'multipolygon', natural: 'water' },
      members: [
        { type: 'way', role: 'outer', geometry: [point(-7.765, 110.38), point(-7.765, 110.382), point(-7.767, 110.382)] },
        { type: 'way', role: 'outer', geometry: [point(-7.765, 110.38), point(-7.767, 110.38), point(-7.767, 110.382)] }, // arah terbalik
        { type: 'way', role: 'inner', geometry: [point(-7.766, 110.381), point(-7.766, 110.3815)] },
      ],
    },
  ],
}

describe('offline', () => {
  test('overpassQuery memuat kotak (selatan,barat,utara,timur) dan meminta geometri JSON', () => {
    const query = overpassQuery([-7.781234567, 110.37, -7.76, 110.39])
    assert.match(query, /^\[out:json\]\[timeout:60\]\[bbox:-7\.78123,110\.37,-7\.76,110\.39\];/)
    assert.match(query, /way\[highway\];/)
    assert.match(query, /out geom;$/)
  })

  test('areaKm2 dan batas luas', () => {
    assert.ok(Math.abs(areaKm2(BOUNDS) - 2.2264 * 2.2264 * Math.cos((7.77 * Math.PI) / 180)) < 0.01)
    assert.ok(areaKm2(BOUNDS) < MAX_AREA_KM2 && areaKm2([-7.9, 110.3, -7.7, 110.5]) > MAX_AREA_KM2)
  })

  test('kindOf memetakan label OpenStreetMap ke jenis gambar', () => {
    const kinds = [{ highway: 'trunk' }, { highway: 'service' }, { highway: 'footway' }, { highway: 'motorway_link' }, { highway: 'bus_stop' }, { building: 'house' },
      { natural: 'water' }, { landuse: 'reservoir' }, { landuse: 'forest' }, { leisure: 'park' }, { waterway: 'canal' }, { waterway: 'dam' }, { aeroway: 'taxiway' }, {}, undefined]
    assert.deepEqual(kinds.map(kindOf), ['major', 'minor', 'path', 'major', null, 'building', 'water', 'water', 'green', 'green', 'stream', null, 'runway', null, null])
  })

  test('joinLines menyambung potongan menjadi lingkar tertutup, termasuk yang arahnya terbalik', () => {
    const [ring, ...others] = joinLines(REPLY.elements.at(-1).members.slice(0, 2).map((member) => member.geometry))
    assert.equal(others.length, 0)
    assert.equal(ring.length, 5)
    assert.deepEqual(ring[0], ring.at(-1))
    assert.equal(joinLines([[point(1, 1), point(2, 2)], [point(5, 5), point(6, 6)], null, []]).length, 2) // yang tidak bertemu dibiarkan
  })

  test('toFeatures: hanya yang digambar, koordinat menjadi deret angka [lat, lng, ...]', () => {
    const features = toFeatures(REPLY)
    assert.deepEqual(features.map(({ kind }) => kind), ['major', 'minor', 'major', 'building', 'green', 'runway', 'stream', 'water'])
    assert.deepEqual(features[0].points, [-7.775, 110.371, -7.765, 110.389])
    assert.equal(features.at(-1).points.length, 10) // danau: 5 titik, lingkar tertutup, bagian "inner" diabaikan
    assert.deepEqual(toFeatures({}), [])
    assert.deepEqual(toFeatures(undefined), [])
  })

  test('mercator: khatulistiwa di tengah, sama dengan rumus ubin peta', () => {
    assert.deepEqual(mercator(0, 0), [0.5, 0.5])
    const [x, y] = mercator(-7.77069, 110.37786)
    // Acuan dihitung terpisah dengan rumus ubin OpenStreetMap: x = (lng + 180) / 360 * 2^z, y = (1 - ln(tan(lat) + sec(lat)) / pi) / 2 * 2^z
    assert.ok(Math.abs(x * 2 ** 16 - 52861.676) < 0.001 && Math.abs(y * 2 ** 16 - 34186.968) < 0.001, `${x * 2 ** 16}, ${y * 2 ** 16}`)
    assert.ok(mercator(85.0511, 0)[1] < 1e-4 && mercator(-85.0511, 0)[1] > 0.9999)
  })

  test('prepareArea mengelompokkan per jenis dan menghitung kotak pembatas', () => {
    const area = prepareArea({ id: 'a', bounds: BOUNDS, savedAt: 1, features: toFeatures(REPLY) })
    assert.equal(area.count, 8)
    assert.deepEqual(Object.fromEntries(Object.entries(area.byKind).map(([kind, list]) => [kind, list.length])), { major: 2, minor: 1, building: 1, green: 1, runway: 1, stream: 1, water: 1 })
    const [left, top, right, bottom] = area.box
    assert.ok(left < right && top < bottom) // y membesar ke selatan
    const { box, xy } = area.byKind.building[0]
    assert.ok(overlaps(box, area.box) && xy.length === 10)
    assert.equal(overlaps([0, 0, 1, 1], [2, 2, 3, 3]), false)
  })
})

/** Canvas tiruan: mencatat apa saja yang digambar. */
function fakeCanvas() {
  const calls = []
  const record = (name) => (...args) => calls.push([name, ...args])
  const ctx = Object.fromEntries(['fillRect', 'strokeRect', 'beginPath', 'moveTo', 'lineTo', 'fill', 'stroke', 'setLineDash'].map((name) => [name, record(name)]))
  return { ctx, calls, count: (name) => calls.filter(([call]) => call === name).length }
}

describe('offlinePaint', () => {
  const area = prepareArea({ id: 'a', bounds: BOUNDS, savedAt: 1, features: toFeatures(REPLY) })
  // Ubin yang memuat titik (-7.77, 110.38) pada zoom tertentu.
  const tileAt = (z) => {
    const [x, y] = mercator(-7.77, 110.38)
    return { x: Math.floor(x * 2 ** z), y: Math.floor(y * 2 ** z), z }
  }

  test('ubin di dalam area: latar, bentuk, dan garis digambar dengan koordinat di sekitar ubin', () => {
    const canvas = fakeCanvas()
    paintTile(canvas.ctx, tileAt(16), [area], PAPER.light)
    assert.ok(canvas.count('fill') >= 2 && canvas.count('stroke') >= 4 && canvas.count('moveTo') >= 3)
    const building = canvas.calls.filter(([name, x, y]) => name === 'lineTo' && x > -50 && x < 306 && y > -50 && y < 306)
    assert.ok(building.length >= 4, 'bangunan di (-7.77, 110.38) harus jatuh di dalam ubin ini')
    assert.ok(canvas.calls.every(([, ...args]) => args.flat().every((value) => typeof value !== 'number' || Number.isFinite(value))))
  })

  test('zoom jauh: bangunan dan jalan kecil tidak digambar', () => {
    const [near, far] = [fakeCanvas(), fakeCanvas()]
    paintTile(near.ctx, tileAt(16), [area], PAPER.dark)
    paintTile(far.ctx, tileAt(11), [area], PAPER.dark)
    assert.ok(far.count('beginPath') < near.count('beginPath'))
  })

  test('ubin di luar area tersimpan hanya berisi latar kosong', () => {
    const canvas = fakeCanvas()
    paintTile(canvas.ctx, { x: 0, y: 0, z: 16 }, [area], PAPER.light)
    assert.equal(canvas.count('fillRect'), 1)
    assert.equal(canvas.count('moveTo') + canvas.count('strokeRect'), 0)
  })

  test('kedua tema punya warna yang sama lengkapnya', () => {
    assert.deepEqual(Object.keys(PAPER.light).sort(), Object.keys(PAPER.dark).sort())
  })
})
