import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { mergeLogs, sampleAt, toSamples, trackOf } from '../src/lib/flight.js'

const detail = { columns: ['t', 'lat', 'lng', 'relAlt'], samples: [[0, -7.5, 110.1, 0], [0.5, -7.6, 110.2, 5], [1, null, null, 9]] }

describe('toSamples', () => {
  test('baris dari server menjadi objek bernama kolom', () => {
    assert.deepEqual(toSamples(detail)[1], { t: 0.5, lat: -7.6, lng: 110.2, relAlt: 5 })
    assert.equal(toSamples(detail).length, 3)
    assert.deepEqual(toSamples({ columns: ['t'], samples: [] }), [])
  })
})

describe('sampleAt', () => {
  const samples = toSamples(detail)
  test('mengambil sampel terakhir yang belum melewati waktu itu', () => {
    assert.equal(sampleAt(samples, 0).t, 0)
    assert.equal(sampleAt(samples, 0.49).t, 0)
    assert.equal(sampleAt(samples, 0.5).t, 0.5)
    assert.equal(sampleAt(samples, 0.99).t, 0.5)
    assert.equal(sampleAt(samples, 1).t, 1)
  })

  test('sebelum sampel pertama dan setelah yang terakhir tetap memberi sampel ujung', () => {
    assert.equal(sampleAt(samples, -5).t, 0)
    assert.equal(sampleAt(samples, 999).t, 1)
  })

  test('cocok dengan pencarian linear pada ribuan sampel', () => {
    const many = Array.from({ length: 2000 }, (_, i) => ({ t: i * 0.5 }))
    for (const t of [0, 0.1, 17.3, 250, 499.5, 999.4, 1500]) {
      const linear = many.findLast((sample) => sample.t <= t) ?? many[0]
      assert.equal(sampleAt(many, t), linear, String(t))
    }
  })
})

describe('trackOf', () => {
  test('melewati sampel tanpa posisi', () => {
    assert.deepEqual(trackOf(toSamples(detail)), [[-7.5, 110.1], [-7.6, 110.2]])
  })
})

describe('mergeLogs', () => {
  const files = [{ name: 'a.tlog', size: 10, modifiedAt: 100 }, { name: 'b.tlog', size: 20, modifiedAt: 300 }]
  const flights = [{ id: 1, logName: 'a.tlog', importedAt: 150 }, { id: 2, logName: 'hilang.tlog', importedAt: 200 }]

  test('file yang sudah diimpor membawa penerbangannya, yang belum bernilai null', () => {
    const rows = mergeLogs(files, flights)
    assert.deepEqual(rows.map(({ name, flight }) => [name, flight?.id ?? null]), [['b.tlog', null], ['hilang.tlog', 2], ['a.tlog', 1]])
  })

  test('penerbangan yang file-nya sudah tidak ada tetap tampil, tanpa ukuran', () => {
    const orphan = mergeLogs(files, flights).find(({ name }) => name === 'hilang.tlog')
    assert.deepEqual([orphan.size, orphan.modifiedAt], [null, 200])
  })

  test('daftar kosong', () => {
    assert.deepEqual(mergeLogs([], []), [])
  })
})