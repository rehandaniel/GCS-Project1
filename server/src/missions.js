import express from 'express'
import { parseId, transaction } from './db.js'

const MAX_ITEMS = 500
const isPlainObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value)
const isNumber = (value) => typeof value === 'number' && Number.isFinite(value)

/** Item dari browser -> nilai kolom mission_items, atau null bila bentuknya salah. */
const toColumns = (item) => {
  if (!isPlainObject(item)) return null
  const { cmd, lat, lng, alt, params, frame } = item
  const valid =
    typeof cmd === 'string' && /^[A-Z0-9_]{1,32}$/.test(cmd) && [lat, lng, alt].every(isNumber) &&
    Array.isArray(params) && params.length === 4 && params.every(isNumber) && (frame === undefined || Number.isInteger(frame))
  return valid ? [cmd, lat, lng, alt, ...params, frame ?? null] : null
}

/** Ambil { name, rows } dari body, atau null bila ada yang tidak valid. */
const parseBody = ({ name, items } = {}) => {
  const rows = Array.isArray(items) && items.length <= MAX_ITEMS ? items.map(toColumns) : null
  const title = typeof name === 'string' ? name.trim() : ''
  return title && title.length <= 80 && rows?.every(Boolean) ? { name: title, rows } : null
}

/** Kolom SQL -> item misi seperti yang dikenal browser dan bridge. */
const toItem = ({ cmd, lat, lng, alt, p1, p2, p3, p4, frame }) => ({ cmd, lat, lng, alt, params: [p1, p2, p3, p4], ...(frame === null ? {} : { frame }) })

/** Perpustakaan misi di database SQL: tabel missions (satu baris per misi) dan mission_items (satu baris per item). */
export function missionsRouter(db) {
  const router = express.Router()
  const sql = {
    list: db.prepare(`
      SELECT m.id, m.name, m.updated_at AS updatedAt, COUNT(i.seq) AS count
      FROM missions m LEFT JOIN mission_items i ON i.mission_id = m.id
      GROUP BY m.id ORDER BY m.updated_at DESC, m.id DESC`),
    one: db.prepare('SELECT id, name, updated_at AS updatedAt FROM missions WHERE id = ?'),
    items: db.prepare('SELECT cmd, lat, lng, alt, p1, p2, p3, p4, frame FROM mission_items WHERE mission_id = ? ORDER BY seq'),
    create: db.prepare('INSERT INTO missions (name, updated_at) VALUES (?, ?)'),
    rename: db.prepare('UPDATE missions SET name = ?, updated_at = ? WHERE id = ?'),
    clear: db.prepare('DELETE FROM mission_items WHERE mission_id = ?'),
    addItem: db.prepare('INSERT INTO mission_items (mission_id, seq, cmd, lat, lng, alt, p1, p2, p3, p4, frame) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'),
    remove: db.prepare('DELETE FROM missions WHERE id = ?'),
  }

  const read = (id) => {
    const mission = sql.one.get(id)
    return mission && { ...mission, items: sql.items.all(id).map(toItem) }
  }
  /** Buat misi baru (id kosong) atau ganti isi misi lama. Nama dan semua item ditulis dalam satu transaksi. */
  const save = (id, { name, rows }) =>
    transaction(db, () => {
      const now = Date.now()
      let missionId = id
      if (missionId === null) {
        missionId = Number(sql.create.run(name, now).lastInsertRowid)
      } else {
        sql.rename.run(name, now, missionId)
        sql.clear.run(missionId)
      }
      rows.forEach((columns, seq) => sql.addItem.run(missionId, seq, ...columns))
      return read(missionId)
    })

  const notFound = (res) => res.status(404).json({ error: 'Mission not found' })
  const invalid = (res) => res.status(400).json({ error: `Expected { name (1-80 chars), items (array of up to ${MAX_ITEMS} waypoint objects) }` })

  router.get('/', (req, res) => res.json(sql.list.all()))

  router.get('/:id', (req, res) => {
    const mission = read(parseId(req.params.id))
    return mission ? res.json(mission) : notFound(res)
  })

  router.post('/', (req, res) => {
    const body = parseBody(req.body)
    return body ? res.status(201).json(save(null, body)) : invalid(res)
  })

  router.put('/:id', (req, res) => {
    const id = parseId(req.params.id)
    if (!id || !sql.one.get(id)) return notFound(res)
    const body = parseBody(req.body)
    return body ? res.json(save(id, body)) : invalid(res)
  })

  router.delete('/:id', (req, res) => {
    const { changes } = sql.remove.run(parseId(req.params.id) ?? 0) // item ikut terhapus lewat ON DELETE CASCADE
    return changes ? res.status(204).end() : notFound(res)
  })

  return router
}