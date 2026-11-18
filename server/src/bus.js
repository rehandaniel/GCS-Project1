import { randomUUID } from 'node:crypto'
import { EventEmitter } from 'node:events'
import { createClient } from 'redis'
import { CHANNEL, KEY } from './config.js'

export class BridgeOffline extends Error {
  constructor() {
    super('Bridge is offline. Start it with: python -m gcs_bridge')
  }
}

export class RpcTimeout extends Error {
  constructor(type) {
    super(`The bridge did not answer "${type}" in time`)
  }
}

const parse = (text) => {
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

/**
 * Jembatan ke Redis. `events` memancarkan 'telemetry' dan 'event' dari bridge;
 * `rpc()` mengirim permintaan lewat Redis dan menunggu jawabannya.
 */
export async function createBus(redisUrl) {
  const events = new EventEmitter()
  const redis = createClient({ url: redisUrl, socket: { reconnectStrategy: (retries) => Math.min(retries * 200, 2_000) } })
  const subscriber = redis.duplicate()
  const pending = new Map() // id permintaan -> { resolve, timer }

  let warned = false
  for (const client of [redis, subscriber]) {
    client.on('error', (error) => {
      if (!warned) console.warn(`Redis: ${error.message} (retrying)`)
      warned = true
    })
    client.on('ready', () => {
      warned = false
    })
  }
  await Promise.all([redis.connect(), subscriber.connect()])

  await subscriber.subscribe(CHANNEL.telemetry, (message) => {
    const frame = parse(message)
    if (frame) events.emit('telemetry', frame)
  })
  await subscriber.subscribe(CHANNEL.events, (message) => {
    const event = parse(message)
    if (event) events.emit('event', event)
  })
  await subscriber.subscribe(CHANNEL.replies, (message) => {
    const reply = parse(message)
    const call = pending.get(reply?.id)
    if (!call) return
    pending.delete(reply.id)
    clearTimeout(call.timer)
    call.resolve({ ok: reply.ok === true, text: String(reply.text ?? ''), data: reply.data ?? null })
  })

  const bridgeAlive = async () => (await redis.exists(KEY.bridge)) === 1

  async function rpc(type, payload, timeoutMs) {
    if (!(await bridgeAlive())) throw new BridgeOffline()
    const id = randomUUID()
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        pending.delete(id)
        reject(new RpcTimeout(type))
      }, timeoutMs)
      pending.set(id, { resolve, timer })
      redis.publish(CHANNEL.commands, JSON.stringify({ ...payload, id, type })).catch((error) => {
        pending.delete(id)
        clearTimeout(timer)
        reject(error)
      })
    })
  }

  return {
    events,
    rpc,
    bridgeAlive,
    state: async () => parse(await redis.get(KEY.state)),
    close: async () => {
      pending.forEach(({ timer }) => clearTimeout(timer))
      pending.clear()
      await Promise.all([redis.close(), subscriber.close()])
    },
  }
}