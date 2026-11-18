import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { fromPlan, fromWaypoints, parseMissionFile, toPlan, toWaypoints } from '../src/lib/files.js'

const items = [
  { cmd: 'TAKEOFF', lat: -7.77069, lng: 110.37786, alt: 20, params: [0, 0, 0, 0] },
  { cmd: 'WAYPOINT', lat: -7.7701234, lng: 110.3791234, alt: 25.5, params: [5, 0, 0, 0] },
  { cmd: 'LOITER_TURNS', lat: -7.7695, lng: 110.38, alt: 30, params: [2, 0, 40, 0] },
  { cmd: 'RTL', lat: 0, lng: 0, alt: 0, params: [0, 0, 0, 0] },
]
const home = { lat: -7.77069, lng: 110.37786, alt: 110 }

describe('.waypoints', () => {
  test('format baris sesuai QGC WPL 110, home di baris 0', () => {
    const lines = toWaypoints(items, home).trimEnd().split('\n')
    assert.equal(lines[0], 'QGC WPL 110')
    assert.equal(lines[1], '0\t1\t0\t16\t0\t0\t0\t0\t-7.77069\t110.37786\t110\t1')
    assert.equal(lines[2], '1\t0\t3\t22\t0\t0\t0\t0\t-7.77069\t110.37786\t20\t1')
    assert.equal(lines.length, 2 + items.length)
  })

  test('tulis lalu baca menghasilkan item yang sama (frame 3 tidak disimpan)', () => {
    assert.deepEqual(fromWaypoints(toWaypoints(items, home)).map(({ frame, ...rest }) => rest), items)
  })

  test('toleran terhadap CRLF, spasi, dan menolak file lain', () => {
    const text = 'QGC WPL 110\r\n0 1 0 16 0 0 0 0 1 2 3 1\r\n1  0  3  16  0  0  0  0  -7.5  110.5  20  1\r\n\r\n'
    assert.deepEqual(fromWaypoints(text), [{ cmd: 'WAYPOINT', lat: -7.5, lng: 110.5, alt: 20, params: [0, 0, 0, 0], frame: 3 }].map(({ frame, ...r }) => (frame === 2 ? { ...r, frame } : r)))
    assert.throws(() => fromWaypoints('hello'), /QGC WPL/)
    assert.deepEqual(fromWaypoints('QGC WPL 110\n1 0 3 16 bukan angka'), [])
  })
})

describe('.plan', () => {
  test('tulis lalu baca menghasilkan item yang sama', () => {
    assert.deepEqual(fromPlan(toPlan(items, home)).map(({ frame, ...rest }) => rest), items)
    const plan = JSON.parse(toPlan(items, home))
    assert.equal(plan.fileType, 'Plan')
    assert.deepEqual(plan.mission.plannedHomePosition, [-7.77069, 110.37786, 110])
    assert.equal(plan.mission.items[1].command, 16)
    assert.deepEqual(plan.mission.items[1].params, [5, 0, 0, 0, -7.7701234, 110.3791234, 25.5])
  })

  test('membaca format lama (coordinate) dan item kompleks (survey)', () => {
    const legacy = JSON.stringify({ fileType: 'Plan', mission: { items: [{ type: 'SimpleItem', command: 16, params: [0, 0, 0, 0], coordinate: [-7.5, 110.5, 20] }] } })
    assert.deepEqual(fromPlan(legacy)[0], { cmd: 'WAYPOINT', lat: -7.5, lng: 110.5, alt: 20, params: [0, 0, 0, 0] })
    const survey = JSON.stringify({
      fileType: 'Plan',
      mission: { items: [{ type: 'ComplexItem', TransectStyleComplexItem: { Items: [{ type: 'SimpleItem', command: 16, params: [0, 0, 0, null, 1, 2, 3] }] } }] },
    })
    assert.deepEqual(fromPlan(survey), [{ cmd: 'WAYPOINT', lat: 1, lng: 2, alt: 3, params: [0, 0, 0, 0] }])
  })

  test('menolak JSON yang bukan .plan', () => {
    assert.throws(() => fromPlan('{"fileType":"Other"}'), /\.plan/)
    assert.throws(() => fromPlan('{rusak'))
  })
})

test('parseMissionFile memilih pembaca dari isi file', () => {
  assert.equal(parseMissionFile(toPlan(items, home)).length, items.length)
  assert.equal(parseMissionFile(toWaypoints(items, home)).length, items.length)
})

