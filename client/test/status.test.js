import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { batteryTone, speedLevel, warningFor } from '../src/lib/status.js'

describe('status', () => {
  test('batteryTone: batas 20% dan 40%, null = netral', () => {
    assert.deepEqual([null, 100, 40, 39, 20, 19, 0].map(batteryTone), ['', 'ok', 'ok', 'warn', 'warn', 'bad', 'bad'])
  })

  test('speedLevel', () => {
    assert.deepEqual([0, 0.5, 0.79, 0.8, 1.4].map((ratio) => speedLevel(ratio)[0]), ['Hover', 'Cruise', 'Cruise', 'High', 'High'])
  })

  test('warningFor: urutan prioritas link > baterai kritis > GPS > baterai rendah', () => {
    const ok = { link: 'connected', gpsFix: 3, batteryPct: 80 }
    assert.equal(warningFor(ok), null)
    assert.equal(warningFor({ ...ok, link: 'lost' })[0], 'bad')
    assert.match(warningFor({ ...ok, link: 'disconnected' })[1], /No vehicle/)
    assert.equal(warningFor({ ...ok, gpsFix: 1, batteryPct: 10 })[0], 'bad') // baterai kritis menang atas GPS
    assert.match(warningFor({ ...ok, gpsFix: 2 })[1], /GPS/)
    assert.match(warningFor({ ...ok, batteryPct: 30 })[1], /30%/)
    assert.equal(warningFor({ ...ok, batteryPct: null }), null) // baterai tidak diketahui bukan peringatan
  })
})