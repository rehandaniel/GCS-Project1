import assert from 'node:assert/strict'
import { beforeEach, describe, test } from 'node:test'
import { newItem } from '../src/lib/mission.js'
import { addEvent } from '../src/state/events.js'
import { addItems, missionItems, moveItem, patchItem, removeItem, setMission } from '../src/state/mission.js'
import { EMPTY_FRAME, store } from '../src/state/store.js'
import { applyFrame } from '../src/state/telemetry.js'

const items = () => store.get().mission.items
const at = (lat, lng = 110) => newItem('WAYPOINT', { lat, lng })

beforeEach(() => {
  setMission({})
  store.set({ t: EMPTY_FRAME, track: [], events: [], unread: 0 })
})

describe('state/mission', () => {
  test('setMission membersihkan item dan memberi id unik', () => {
    setMission({ name: 'A', items: [at(1), { cmd: 'HACK' }, at(2)] })
    assert.equal(store.get().mission.name, 'A')
    assert.equal(items().length, 2)
    assert.equal(new Set(items().map((item) => item.id)).size, 2)
  })

  test('addItems, patchItem, removeItem bekerja per id', () => {
    addItems([at(1), at(2), at(3)])
    const [a, b, c] = items()
    patchItem(b.id, { alt: 55 })
    assert.deepEqual(items().map((item) => item.alt), [20, 55, 20])
    removeItem(a.id)
    assert.deepEqual(items().map((item) => item.id), [b.id, c.id])
  })

  test('moveItem menggeser satu langkah dan diam di ujung', () => {
    addItems([at(1), at(2), at(3)])
    const [a, b, c] = items()
    moveItem(a.id, -1)
    moveItem(c.id, 1)
    assert.deepEqual(items().map((item) => item.id), [a.id, b.id, c.id])
    moveItem(c.id, -1)
    assert.deepEqual(items().map((item) => item.id), [a.id, c.id, b.id])
  })

  test('missionItems membuang id (data bersih untuk dikirim/disimpan)', () => {
    addItems([at(1)])
    assert.deepEqual(missionItems(), [{ cmd: 'WAYPOINT', lat: 1, lng: 110, alt: 20, params: [0, 0, 0, 0] }])
  })
})

describe('state/telemetry', () => {
  const frame = (lat, lng, extra = {}) => ({ ...EMPTY_FRAME, link: 'connected', lat, lng, ...extra })

  test('jejak hanya bertambah bila bergerak ≥ 2 m dan frame tanpa GPS diabaikan', () => {
    applyFrame(frame(null, null))
    assert.equal(store.get().track.length, 0)
    applyFrame(frame(-7.77, 110.37))
    applyFrame(frame(-7.770001, 110.37)) // ~0,1 m
    assert.equal(store.get().track.length, 1)
    applyFrame(frame(-7.77003, 110.37)) // ~3,3 m
    assert.equal(store.get().track.length, 2)
    assert.equal(store.get().t.lat, -7.77003)
  })

  test('penerbangan baru (arm) menghapus jejak lama', () => {
    applyFrame(frame(-7.77, 110.37))
    applyFrame(frame(-7.7701, 110.37))
    applyFrame(frame(-7.7702, 110.37, { armed: true }))
    assert.deepEqual(store.get().track, [{ lat: -7.7702, lng: 110.37 }])
  })

  test('jejak dibatasi 3000 titik', () => {
    for (let i = 0; i < 3100; i++) applyFrame(frame(-7 + i * 0.0001, 110))
    assert.equal(store.get().track.length, 3000)
    assert.equal(store.get().track.at(-1).lat, -7 + 3099 * 0.0001)
  })
})

describe('state/events', () => {
  test('pesan terbaru di depan, info tidak menambah belum-dibaca, dan dibatasi 100', () => {
    for (let i = 0; i < 120; i++) addEvent({ text: `pesan ${i}` })
    const { events, unread } = store.get()
    assert.equal(events.length, 100)
    assert.equal(events[0].text, 'pesan 119')
    assert.equal(unread, 0)
  })
})