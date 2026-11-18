import { io } from 'socket.io-client'
import { addEvent, notify } from './events.js'
import { store } from './store.js'
import { applyFrame } from './telemetry.js'

const socket = io({ autoConnect: false }) // satu origin: di mode dev, Vite meneruskan /socket.io ke server
const RPC_TIMEOUT_MS = 25_000 // lebih lama dari batas terlama di server untuk perintah biasa (misi 20 dtk)

export function startSocket() {
  socket.on('connect', () => store.set({ online: true }))
  socket.on('disconnect', () => store.set({ online: false, bridge: false }))
  socket.on('hello', ({ state, bridge }) => {
    store.set({ bridge })
    if (state) applyFrame(state)
  })
  socket.on('telemetry', applyFrame)
  socket.on('event', addEvent)
  socket.on('bridge', ({ alive }) => store.set({ bridge: alive }))
  socket.connect()
}

// Kirim permintaan ke bridge lewat server. Selalu mengembalikan { ok, text, data } dan tidak pernah melempar error.
// `timeoutMs` hanya perlu diisi untuk permintaan yang memang lama (membaca semua parameter).
export async function rpc(request, timeoutMs = RPC_TIMEOUT_MS) {
  if (store.get().demo) return { ok: false, text: 'Demo mode: nothing is sent to a vehicle', data: null }
  if (!socket.connected) return { ok: false, text: 'Not connected to the GCS server', data: null }
  try {
    return await socket.timeout(timeoutMs).emitWithAck('rpc', request)
  } catch {
    return { ok: false, text: 'The server did not answer in time', data: null }
  }
}

// Seperti rpc, tetapi hasilnya langsung ditampilkan sebagai toast.
export async function run(request) {
  const reply = await rpc(request)
  notify(reply.text, reply.ok ? 'info' : 'bad')
  return reply
}
