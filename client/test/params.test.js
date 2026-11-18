import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { filterParams, formatParam, groupParams, isAddonMissing, paramGroup, toParamFile } from '../src/lib/params.js'

const items = [
  { name: 'ATC_RAT_PIT_P', value: 0.135, type: 9 },
  { name: 'ATC_RAT_RLL_P', value: 0.13500000536441803, type: 9 },
  { name: 'BATT_CAPACITY', value: 5200, type: 6 },
  { name: 'WPNAV_SPEED', value: 1000, type: 9 },
]

describe('params', () => {
  test('paramGroup dan groupParams mengelompokkan menurut awalan nama', () => {
    assert.equal(paramGroup('ATC_RAT_RLL_P'), 'ATC')
    assert.equal(paramGroup('SYSID_THISMAV'), 'SYSID')
    assert.equal(paramGroup('FORMAT'), 'FORMAT')
    assert.deepEqual(['FLTMODE1', 'FLTMODE6', 'FLTMODE_CH', 'SERIAL1_BAUD', '42'].map(paramGroup), ['FLTMODE', 'FLTMODE', 'FLTMODE', 'SERIAL1', '42'])
    assert.deepEqual(groupParams(items).map(([group, list]) => [group, list.length]), [['ATC', 2], ['BATT', 1], ['WPNAV', 1]])
  })

  test('formatParam membuang ekor pecahan float32', () => {
    assert.deepEqual([0.13500000536441803, 5200, -1, 0, 1e-7, NaN, null].map(formatParam), ['0.135', '5200', '-1', '0', '1e-7', '—', '—'])
  })

  test('filterParams: huruf besar/kecil diabaikan, semua kata harus cocok', () => {
    assert.deepEqual(filterParams(items, 'rat').map(({ name }) => name), ['ATC_RAT_PIT_P', 'ATC_RAT_RLL_P'])
    assert.deepEqual(filterParams(items, ' atc  rll ').map(({ name }) => name), ['ATC_RAT_RLL_P'])
    assert.equal(filterParams(items, '   '), items)
    assert.deepEqual(filterParams(items, 'zzz'), [])
  })

  test('toParamFile: satu baris NAMA,NILAI per parameter', () => {
    assert.equal(toParamFile(items.slice(1, 3)), 'ATC_RAT_RLL_P,0.135\nBATT_CAPACITY,5200\n')
  })

  test('isAddonMissing membedakan "backend belum mendukung" dari kesalahan lain', () => {
    assert.equal(isAddonMissing({ ok: false, text: 'Invalid request: param.list' }), true) // server lama
    assert.equal(isAddonMissing({ ok: false, text: "Unknown request type 'param.list'" }), true) // bridge lama
    assert.equal(isAddonMissing({ ok: false, text: 'No vehicle connected' }), false)
    assert.equal(isAddonMissing({ ok: false, text: 'The server did not answer in time' }), false)
    assert.equal(isAddonMissing({ ok: true, text: '12 parameter(s) read' }), false)
  })
})
