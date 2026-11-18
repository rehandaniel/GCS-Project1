import { isDeepStrictEqual } from 'node:util'
import express from 'express'
import { BridgeOffline, RpcTimeout } from './bus.js'
import { parseId, transaction } from './db.js'
import { LOG_NAME } from './logs.js'

// Kolom flight_samples, dalam urutan yang dikirim bridge (`log.parse`). Daftar ini tetap, jadi aman dipakai di teks SQL.
const SAMPLE_COLUMNS = ['t', 'lat', 'lng', 'alt', 'rel_alt', 'roll', 'pitch', 'yaw', 'ground_speed', 'air_speed', 'climb']
const PARSE_TIMEOUT_MS = 120_000 // membaca file .tlog besar di Python bisa memakan waktu
const camel = (name) => name.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())

/** Penerbangan di database SQL: ringkasan di tabel flights, telemetri per 0,5 detik di tabel flight_samples. */
export function flightsRouter(db, bus) {
  const router = express.Router()
  const summary = `id, log_name AS logName, vehicle, started_at AS startedAt, duration_s AS duration, distance_m AS distance,
                   max_alt_m AS maxAlt, max_speed_ms AS maxSpeed, messages, sample_count AS sampleCount, imported_at AS importedAt`
  const sql = {
    list: db.prepare(`SELECT ${summary} FROM flights ORDER BY started_at DESC`),
    one: db.prepare(`SELECT ${summary} FROM flights WHERE id = ?`),
    samples: db.prepare(`SELECT ${SAMPLE_COLUMNS.join(', ')} FROM flight_samples WHERE flight_id = ? ORDER BY t`),
    forget: db.prepare('DELETE FROM flights WHERE log_name = ?'), // sampelnya ikut terhapus lewat ON DELETE CASCADE
    add: db.prepare(`INSERT INTO flights (log_name, vehicle, started_at, duration_s, distance_m, max_alt_m, max_speed_ms, messages, sample_count, imported_at)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`),
    addSample: db.prepare(`INSERT INTO flight_samples (flight_id, ${SAMPLE_COLUMNS.join(', ')}) VALUES (?${', ?'.repeat(SAMPLE_COLUMNS.length)})`),
    remove: db.prepare('DELETE FROM flights WHERE id = ?'),
  }

  /** Simpan hasil baca log. Mengimpor log yang sama lagi menggantikan yang lama. */
  const store = (logName, { flight, samples }) =>
    transaction(db, () => {
      sql.forget.run(logName)
      const { vehicle, startedAt, duration, distance, maxAlt, maxSpeed, messages } = flight
      const id = Number(sql.add.run(logName, vehicle, startedAt, duration, distance, maxAlt, maxSpeed, messages, samples.length, Date.now()).lastInsertRowid)
      samples.forEach((row) => sql.addSample.run(id, ...row))
      return sql.one.get(id)
    })

  router.get('/', (req, res) => res.json(sql.list.all()))

  router.get('/:id', (req, res) => {
    const id = parseId(req.params.id)
    const flight = id && sql.one.get(id)
    if (!flight) return res.status(404).json({ error: 'Flight not found' })
    const samples = sql.samples.all(id).map((row) => SAMPLE_COLUMNS.map((name) => row[name]))
    res.json({ ...flight, columns: SAMPLE_COLUMNS.map(camel), samples })
  })

  router.post('/', async (req, res) => {
    const name = req.body?.log
    if (typeof name !== 'string' || !LOG_NAME.test(name)) return res.status(400).json({ error: 'Expected { log: "<file>.tlog" }' })
    let reply
    try {
      reply = await bus.rpc('log.parse', { name }, PARSE_TIMEOUT_MS) // membaca .tlog adalah tugas bridge Python (pymavlink)
    } catch (error) {
      if (error instanceof BridgeOffline || error instanceof RpcTimeout) return res.status(503).json({ error: error.message })
      throw error
    }
    if (!reply.ok) return res.status(422).json({ error: reply.text })
    if (!isDeepStrictEqual(reply.data?.columns, SAMPLE_COLUMNS) || !Array.isArray(reply.data.samples)) {
      return res.status(502).json({ error: 'The bridge returned a log in an unexpected format. Update the bridge and the server together.' })
    }
    res.status(201).json(store(name, reply.data))
  })

  router.delete('/:id', (req, res) => {
    const { changes } = sql.remove.run(parseId(req.params.id) ?? 0)
    return changes ? res.status(204).end() : res.status(404).json({ error: 'Flight not found' })
  })

  return router
}