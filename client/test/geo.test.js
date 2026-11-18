import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { bearing, clamp, destination, distance, wrap360 } from '../src/lib/geo.js'
import { cardinal, formatBytes, formatDistance, formatDuration } from '../src/lib/format.js'

const near = (actual, expected, tolerance) => assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} bukan ~${expected} (±${tolerance})`)

describe('geo', () => {
    test('clamp dan wrap360', () => {
        assert.equal(clamp(15, 0, 10), 10)
        assert.equal(clamp(-3, 0, 10), 0)
        assert.deepEqual([wrap360(-90), wrap360(360), wrap360(725)], [270, 0, 5])
    })

    test('distance: 1 derajat bujur di khatulistiwa ≈ 111.19 km', () => {
        near(distance({ lat: 0, lng: 0}, { lat: 0, lng: 1}), 111_195, 5)
        assert.equal(distance({ lat: -7.77, lng: 110.37 }, { lat: -7.77, lng: 110.37 }), 0)
    })

    test('bearing: utara 0, timur 90, selatan 180, barat 270', () => {
        const o = { lat: 0, lng: 0 }
        assert.deepEqual([{ lat: 1, lng: 0 }, { lat: 0, lng: 1}, { lat: -1, lng: 0 }, { lat: 0, lng: -1}].map((p) => Math.round(bearing(o, p))),[0, 90, 180, 270])
    })

    test('destination adalah kebalikan dari distance + bearing', () => {
        const from = { lat: -7.77069, lng: 110.37786 }
        for (const heading of [0, 45, 133, 270]) {
            const to = destination(from, heading, 500)
            near(distance(from, to), 500, 0.01)
            near(bearing(from, to), heading, 0.01)
        }
    })
})

describe('format',() => {
    test('formatDuration', () => {
        assert.deepEqual([0, 125, 3725].map(formatDuration), ['00:00', '02:05', '1:02:05'])
    })
    test('formatDistance, cardinal, formatBytes', () => {
        assert.deepEqual([[999.4, '999 m'], [1500, '1.50 km']].map(([m]) => formatDistance(m)), ['999 m', '1.50 km'])
        assert.deepEqual([0, 44, 46, 315, 359, 360].map(cardinal), ['N', 'NE', 'NE', 'NW', 'N', 'N'])
        assert.deepEqual([10, 2048, 5 * 1048576].map(formatBytes), ['1 KB', '2 KB', '5.0 MB'])
    })
})