import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { linkStatus } from '../src/lib/status.js'
import { BAR_GROUPS, GROUPS, formatField, searchFields } from '../src/lib/telemetry.js'
import { EMPTY_FRAME } from '../src/state/store.js'

describe('telemetry', () => {
  test('setiap field di tabel memang ada di frame telemetri, tanpa nama ganda', () => {
    const keys = GROUPS.flatMap(({ fields }) => fields.map(({ key }) => key))
    assert.equal(new Set(keys).size, keys.length)
    for (const key of keys) assert.ok(key in EMPTY_FRAME, `${key} tidak ada di EMPTY_FRAME`)
  })

  test('bilah data berisi posisi, attitude, dan kecepatan (field yang juga ada di rekaman)', () => {
    assert.deepEqual(BAR_GROUPS.map(({ title, fields }) => [title, fields.map(({ key }) => key)]), [
      ['Position', ['lat', 'lng', 'alt', 'relAlt']],
      ['Attitude', ['roll', 'pitch', 'yaw']],
      ['Speed', ['groundSpeed', 'airSpeed', 'climb']],
    ])
  })

  test('formatField: desimal sesuai tabel, yang belum ada datanya menjadi tanda pisah', () => {
    const frame = { lat: -7.770694, relAlt: 12.345, armed: true, recording: false, mode: 'LOITER', firmware: '', hdop: null, climb: NaN, sats: 0 }
    const text = (key, digits) => formatField(frame, { key, digits })
    assert.deepEqual(
      [text('lat', 6), text('relAlt', 1), text('armed'), text('recording'), text('mode'), text('firmware'), text('hdop', 2), text('climb', 1), text('sats', 0), text('entah')],
      ['-7.770694', '12.3', 'Yes', 'No', 'LOITER', '—', '—', '—', '0', '—'],
    )
    assert.equal(formatField(undefined, { key: 'lat', digits: 6 }), '—')
  })

  test('searchFields: mencari di label, nama field, dan nama kelompok', () => {
    assert.deepEqual(searchFields('battery').map(({ title }) => title), ['Power'])
    assert.deepEqual(searchFields('relAlt').flatMap(({ fields }) => fields.map(({ key }) => key)), ['relAlt'])
    assert.equal(searchFields('gps')[0].fields.length, 3)
    assert.equal(searchFields('').length, GROUPS.length)
    assert.deepEqual(searchFields('tidak ada'), [])
  })
})

describe('status/linkStatus', () => {
  test('yang putus paling dekat dengan browser dilaporkan lebih dulu', () => {
    assert.deepEqual(linkStatus(false, true, 'connected'), ['Server offline', 'bad'])
    assert.deepEqual(linkStatus(true, false, 'connected'), ['Bridge offline', 'bad'])
    assert.deepEqual(linkStatus(true, true, 'connected'), ['Connected', 'ok'])
    assert.deepEqual(linkStatus(true, true, 'lost'), ['Link lost', 'bad'])
    assert.deepEqual(linkStatus(true, true, 'connecting'), ['Connecting…', 'warn'])
    assert.deepEqual(linkStatus(true, true, 'entah'), ['No vehicle', 'warn'])
  })
})
