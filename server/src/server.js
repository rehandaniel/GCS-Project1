import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'
import express from 'express'
import { Server } from 'socket.io'
import { BridgeOffline, RpcTimeout, createBus } from './bus.js'
import { openDatabase } from './db.js'
import { flightsRouter } from './flights.js'
import { logsRouter } from './logs.js'
import { missionsRouter } from './missions.js'
import { BadRequest, parseRequest } from './rpc.js'

const SAFE_ERRORS = [BadRequest, BridgeOffline, RpcTimeout] // pesannya aman ditampilkan ke operator

/** Rakit server: REST + Socket.IO di atas bus Redis. Tidak langsung listen, supaya mudah diuji. */
export async function createServer(config) {
  const db = openDatabase(config.dbPath)
  const bus = await createBus(config.redisUrl)
  const app = express()
  app.disable('x-powered-by')
  app.use(express.json({ limit: '1mb' }))

  app.get('/api/health', async (req, res) => {
    try {
      res.json({ ok: true, redis: true, bridge: await bus.bridgeAlive() })
    } catch {
      res.status(503).json({ ok: false, redis: false, bridge: false })
    }
  })
  app.use('/api/missions', missionsRouter(db))
  app.use('/api/flights', flightsRouter(db, bus))
  app.use('/api/logs', logsRouter(config.logDir))
  app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }))

  if (fs.existsSync(config.clientDir)) {
    app.use(express.static(config.clientDir))
    app.get('/{*splat}', (req, res) => res.sendFile(path.join(config.clientDir, 'index.html')))
  }

  app.use((error, req, res, next) => {
    const status = error.status ?? 500 // body-parser memberi status 400 untuk JSON rusak
    if (status >= 500) console.error(error)
    res.status(status).json({ error: status >= 500 ? 'Server error' : error.message })
  })

  const httpServer = http.createServer(app)
  const io = new Server(httpServer, { cors: config.corsOrigin ? { origin: config.corsOrigin } : undefined })

  io.on('connection', async (socket) => {
    socket.on('rpc', async (request, ack) => {
      if (typeof ack !== 'function') return
      try {
        const { type, payload, timeoutMs } = parseRequest(request)
        ack(await bus.rpc(type, payload, timeoutMs))
      } catch (error) {
        const safe = SAFE_ERRORS.some((Safe) => error instanceof Safe)
        if (!safe) console.error(error)
        ack({ ok: false, text: safe ? error.message : 'Server error', data: null })
      }
    })
    try {
      socket.emit('hello', { state: await bus.state(), bridge: await bus.bridgeAlive() })
    } catch (error) {
      console.error(error)
    }
  })
  bus.events.on('telemetry', (frame) => io.volatile.emit('telemetry', frame))
  bus.events.on('event', (event) => io.emit('event', event))

  // Beritahu browser saat bridge hidup / mati (kunci gcs:bridge kedaluwarsa 3 detik setelah bridge berhenti)
  let lastAlive = null
  const watchdog = setInterval(async () => {
    const alive = await bus.bridgeAlive().catch(() => false)
    if (alive !== lastAlive) io.emit('bridge', { alive: (lastAlive = alive) })
  }, 1_000)
  watchdog.unref()

  return {
    app,
    bus,
    db,
    /** Mulai mendengarkan; mengembalikan port yang dipakai (berguna bila config.port = 0). */
    start: () => new Promise((resolve) => httpServer.listen(config.port, config.host, () => resolve(httpServer.address().port))),
    stop: async () => {
      clearInterval(watchdog)
      await io.close()
      await bus.close()
      db.close()
    },
  }
}