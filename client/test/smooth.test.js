import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { chase, settled, unwrap } from '../src/lib/smooth.js'

describe('smooth', () => {
  test('unwrap memilih putaran terpendek', () => {
    assert.equal(unwrap(350, 10), 370)
    assert.equal(unwrap(10, 350), -10)
    assert.equal(unwrap(90, 180), 180)
    assert.equal(unwrap(725, 10), 730) // nilai yang sudah berputar dua kali tetap lanjut dari tempatnya
  })

  test('chase: langkah pertama langsung di tempat, berikutnya mendekat tanpa melewati tujuan', () => {
    assert.deepEqual(chase(null, { roll: 10 }, 0.016), { roll: 10 })
    let now = { roll: 0 }
    const seen = []
    for (let i = 0; i < 30; i++) seen.push((now = chase(now, { roll: 10 }, 0.016)).roll)
    assert.ok(seen.every((value, i) => value > (seen[i - 1] ?? 0) && value <= 10))
    assert.ok(seen.at(-1) > 9.9, `setelah 0,5 detik seharusnya hampir sampai (dapat ${seen.at(-1)})`)
  })

  test('chase: sudut berputar lewat jalan terpendek, angka kosong tidak dikejar', () => {
    const next = chase({ heading: 350, lat: null }, { heading: 10, lat: -7.5 }, 0.05, ['heading'])
    assert.ok(next.heading > 350 && next.heading < 370)
    assert.equal(next.lat, -7.5)
    assert.equal(chase({ lat: -7.5 }, { lat: null }, 0.05).lat, null)
  })

  test('chase: dt sangat besar (gerak dikurangi) langsung sampai', () => {
    assert.deepEqual(chase({ roll: 0, heading: 350 }, { roll: 10, heading: 10 }, 0.05, ['heading'], Infinity), { roll: 10, heading: 370 })
  })

  test('settled: benar hanya bila semua nilai sudah sampai', () => {
    assert.equal(settled({ roll: 10, heading: 370 }, { roll: 10, heading: 10 }, ['heading']), true)
    assert.equal(settled({ roll: 9.9 }, { roll: 10 }), false)
    assert.equal(settled(null, { roll: 10 }), false)
    assert.equal(settled({ lat: null }, { lat: null }), true)
    let now = { roll: 0 }
    for (let i = 0; i < 400 && !settled(now, { roll: 25 }); i++) now = chase(now, { roll: 25 }, 0.016)
    assert.equal(now.roll, 25, 'animasi harus benar-benar berhenti di tujuan')
  })
})
