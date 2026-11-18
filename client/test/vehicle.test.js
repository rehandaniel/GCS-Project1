import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { VEHICLES, vehicleKind, vehiclePath } from '../src/lib/vehicle.js'

describe('vehicle', () => {
  test('vehicleKind: angka MAV_TYPE menentukan jenis', () => {
    const kinds = { 1: 'plane', 2: 'quad', 4: 'heli', 10: 'rover', 11: 'boat', 12: 'sub', 13: 'hexa', 14: 'octo', 15: 'tri', 20: 'vtol', 22: 'vtol', 29: 'dodeca', 35: 'deca' }
    for (const [mavType, kind] of Object.entries(kinds)) assert.equal(vehicleKind({ mavType: Number(mavType), type: 'other' }), kind, `MAV_TYPE ${mavType}`)
  })

  test('vehicleKind: angka tak dikenal memakai kelompok dari bridge, lalu "other"', () => {
    assert.equal(vehicleKind({ mavType: 0, type: 'copter' }), 'quad')
    assert.equal(vehicleKind({ mavType: 99, type: 'plane' }), 'plane')
    assert.equal(vehicleKind({ type: 'rover' }), 'rover')
    assert.equal(vehicleKind({ mavType: 6, type: 'other' }), 'other')
    assert.equal(vehicleKind(), 'other')
  })

  test('setiap jenis punya nama dan bentuk ikon yang sah dan berbeda', () => {
    const paths = Object.keys(VEHICLES).map((kind) => {
      const path = vehiclePath(kind)
      assert.match(path, /^M[\d\s.,MLCHVAZmlchvaz-]+z$/, kind) // hanya perintah path SVG dan angka
      assert.ok(!/NaN|undefined|Infinity/.test(path), kind)
      assert.ok(VEHICLES[kind].name, kind)
      return path
    })
    assert.equal(new Set(paths).size, paths.length)
    assert.equal(vehiclePath('entah'), vehiclePath('other'))
  })

  test('multirotor: jumlah baling-baling sesuai dan ikon tetap di dalam kotak 48 x 48', () => {
    for (const [kind, { rotors }] of Object.entries(VEHICLES).filter(([, vehicle]) => vehicle.rotors)) {
      const path = vehiclePath(kind)
      assert.equal(path.match(/a[\d.]+ [\d.]+ 0 1 1/g).length, rotors * 2, kind) // tiap lingkaran = dua busur
      const numbers = path.match(/M-?[\d.]+ -?[\d.]+/g).flatMap((move) => move.slice(1).split(' ').map(Number))
      assert.ok(numbers.every((value) => value >= 0 && value <= 48), kind)
    }
  })
})
