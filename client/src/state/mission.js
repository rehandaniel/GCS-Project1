import { sanitize } from '../lib/mission.js'
import { store } from './store.js'

let nextId = 1
const withId = (item) => ({ ...item, id: nextId++ }) // id hanya ada di browser: dipakai sebagai key React dan penanda marker
const update = (change) => store.set(({ mission }) => ({ mission: { ...mission, ...change(mission) } }))

export const setMission = ({ id = null, name = 'Untitled mission', items = [] }) => store.set({ mission: { id, name, items: sanitize(items).map(withId) }, selectedId: null })
export const renameMission = (name) => update(() => ({ name }))
export const addItems = (items) => update(({ items: current }) => ({ items: [...current, ...items.map(withId)] }))
export const patchItem = (id, patch) => update(({ items }) => ({ items: items.map((item) => (item.id === id ? { ...item, ...patch } : item)) }))
export const removeItem = (id) => update(({ items }) => ({ items: items.filter((item) => item.id !== id) }))
export const selectItem = (selectedId) => store.set({ selectedId })
export const markSaved = (id) => update(() => ({ id }))

// Pindahkan item satu posisi ke atas (-1) atau bawah (+1). 
export const moveItem = (id, step) =>
  update(({ items }) => {
    const from = items.findIndex((item) => item.id === id)
    const to = from + step
    if (from < 0 || to < 0 || to >= items.length) return {}
    const next = [...items]
    next.splice(to, 0, next.splice(from, 1)[0])
    return { items: next }
  })

// Item bersih (tanpa id) untuk dikirim ke kendaraan, disimpan, atau diekspor. 
export const missionItems = () => sanitize(store.get().mission.items)