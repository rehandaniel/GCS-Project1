import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { COMMANDS, MAX_ITEMS, commandId, commandName, isPositional, newItem, sanitize, stats } from '../src/lib/mission.js'

describe('tabel perintah', () => {
  test('id MAVLink benar dan bisa dibolak-balik', () => {
    assert.deepEqual(Object.values(COMMANDS).map((c) => c.id), [16, 18, 19, 20, 21, 22])
    assert.equal(commandName(commandId('LOITER_TIME')), 'LOITER_TIME')
    assert.equal(commandName(183), 'CMD_183') // perintah asing dipertahankan
    assert.equal(commandId('CMD_183'), 183)
  })

  test('newItem memakai nilai bawaan param dan menghormati jenis perintah', () => {
    assert.deepEqual(newItem('LOITER_TIME', { lat: 1, lng: 2 }, 30), { cmd: 'LOITER_TIME', lat: 1, lng: 2, alt: 30, params: [10, 0, 0, 0] })
    assert.deepEqual(newItem('LOITER_TURNS', { lat: 1, lng: 2 }).params, [1, 0, 30, 0])
    assert.deepEqual(newItem('RTL', { lat: 1, lng: 2 }), { cmd: 'RTL', lat: 0, lng: 0, alt: 0, params: [0, 0, 0, 0] })
    assert.equal(newItem('LAND', { lat: 1, lng: 2 }).alt, 0)
  })

  test('isPositional', () => {
    assert.equal(isPositional({ cmd: 'WAYPOINT' }), true)
    assert.equal(isPositional({ cmd: 'RTL' }), false)
    assert.equal(isPositional({ cmd: 'CMD_183', lat: 0, lng: 0 }), false)
    assert.equal(isPositional({ cmd: 'CMD_183', lat: 1, lng: 2 }), true)
    assert.equal(isPositional({ cmd: 'WAYPOINT', frame: 2 }), false)
  })
})

describe('sanitize', () => {
  test('membuang sampah, memaksa angka, memotong parameter', () => {
    const clean = sanitize([
      { cmd: 'WAYPOINT', lat: '-7.5', lng: '110', alt: '20', params: ['5', 'x'] },
      { cmd: 'constructor' }, { cmd: '__proto__' }, { cmd: 'HACK' }, null, 'teks', 42,
      { cmd: 'CMD_183', lat: 1, lng: 2, alt: 3, params: [1, 2, 3, 4, 5, 6], frame: 2 },
    ])
    assert.deepEqual(clean, [
      { cmd: 'WAYPOINT', lat: -7.5, lng: 110, alt: 20, params: [5, 0, 0, 0] },
      { cmd: 'CMD_183', lat: 1, lng: 2, alt: 3, params: [1, 2, 3, 4], frame: 2 },
    ])
  })

  test('bukan array -> kosong, dan dibatasi MAX_ITEMS', () => {
    assert.deepEqual(sanitize({}), [])
    assert.equal(sanitize(Array.from({ length: MAX_ITEMS + 50 }, () => ({ cmd: 'RTL' }))).length, MAX_ITEMS)
  })
})

describe('stats', () => {
  const home = { lat: 0, lng: 0 }
  const east = (lng) => ({ cmd: 'WAYPOINT', lat: 0, lng, alt: 20, params: [0, 0, 0, 0] })

  test('jarak home -> titik -> kembali hanya bila ada RTL', () => {
    const route = [east(0.001), east(0.002)]
    const one = stats(route, { home, speed: 10 })
    assert.ok(Math.abs(one.distance - 222.39) < 0.1)
    const back = stats([...route, { cmd: 'RTL', lat: 0, lng: 0, alt: 0, params: [0, 0, 0, 0] }], { home, speed: 10 })
    assert.ok(Math.abs(back.distance - 444.78) < 0.2)
    assert.equal(stats([], { home }).distance, 0)
  })

  test('waktu = jarak/kecepatan + tahan di titik + putaran orbit', () => {
    const items = [{ ...east(0.001), params: [30, 0, 0, 0] }, { cmd: 'LOITER_TIME', lat: 0, lng: 0.001, alt: 20, params: [10, 0, 0, 0] }]
    const { duration, count } = stats(items, { home, speed: 10 })
    assert.equal(count, 2)
    assert.ok(Math.abs(duration - (11.12 + 40)) < 0.1)
    const orbit = stats([{ cmd: 'LOITER_TURNS', lat: 0, lng: 0, alt: 20, params: [2, 0, 50, 0] }], { home, speed: 10 })
    assert.ok(Math.abs(orbit.duration - (2 * 2 * Math.PI * 50) / 10) < 0.01)
  })
})

