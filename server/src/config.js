import path from 'node:path'
import { fileURLToPath } from 'node:url'

const fromHere = (relative) => fileURLToPath(new URL(relative, import.meta.url))

export const config = {
  port: Number(process.env.PORT ?? 3001),
  host: process.env.HOST ?? '127.0.0.1', // sengaja hanya localhost: GCS ini tidak punya login
  redisUrl: process.env.REDIS_URL ?? 'redis://127.0.0.1:6379',
  logDir: path.resolve(process.env.LOG_DIR ?? fromHere('../../logs')),
  dbPath: path.resolve(process.env.DB_PATH ?? fromHere('../../data/gcs.db')), // database SQL (SQLite): misi dan penerbangan
  clientDir: fromHere('../../client/dist'),
  corsOrigin: process.env.CORS_ORIGIN || undefined, // kosong = hanya same-origin
}

// Nama channel dan key Redis. Harus sama persis dengan bridge/gcs_bridge/config.py
export const CHANNEL = {
  telemetry: 'gcs:telemetry',
  events: 'gcs:events',
  commands: 'gcs:commands',
  replies: 'gcs:replies',
}
export const KEY = {
  state: 'gcs:state',
  bridge: 'gcs:bridge',
}