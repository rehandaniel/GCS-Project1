import fs from 'node:fs'
import path from 'node:path'
import { DatabaseSync } from 'node:sqlite'

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS missions (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT    NOT NULL CHECK (length(name) BETWEEN 1 AND 80),
    updated_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS mission_items (
    mission_id INTEGER NOT NULL REFERENCES missions (id) ON DELETE CASCADE,
    seq        INTEGER NOT NULL,
    cmd        TEXT    NOT NULL,
    lat        REAL    NOT NULL,
    lng        REAL    NOT NULL,
    alt        REAL    NOT NULL,
    p1 REAL NOT NULL, p2 REAL NOT NULL, p3 REAL NOT NULL, p4 REAL NOT NULL,
    frame      INTEGER,
    PRIMARY KEY (mission_id, seq)
  ) WITHOUT ROWID;

  CREATE TABLE IF NOT EXISTS flights (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    log_name     TEXT    NOT NULL UNIQUE,
    vehicle      TEXT    NOT NULL,
    started_at   INTEGER NOT NULL,
    duration_s   REAL    NOT NULL,
    distance_m   REAL    NOT NULL,
    max_alt_m    REAL    NOT NULL,
    max_speed_ms REAL    NOT NULL,
    messages     INTEGER NOT NULL,
    sample_count INTEGER NOT NULL,
    imported_at  INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS flight_samples (
    flight_id    INTEGER NOT NULL REFERENCES flights (id) ON DELETE CASCADE,
    t            REAL    NOT NULL,
    lat REAL, lng REAL, alt REAL, rel_alt REAL,
    roll REAL, pitch REAL, yaw REAL,
    ground_speed REAL, air_speed REAL, climb REAL,
    PRIMARY KEY (flight_id, t)
  ) WITHOUT ROWID;`

export function openDatabase(file) {
  if (file !== ':memory:') fs.mkdirSync(path.dirname(file), { recursive: true })
  const db = new DatabaseSync(file)
  db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;')
  db.exec(SCHEMA)
  return db
}

export function transaction(db, work) {
  db.exec('BEGIN')
  try {
    const result = work()
    db.exec('COMMIT')
    return result
  } catch (error) {
    db.exec('ROLLBACK')
    throw error
  }
}

export const parseId = (text) => (/^[1-9]\d{0,14}$/.test(text) ? Number(text) : null)
