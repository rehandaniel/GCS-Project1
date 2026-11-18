import { isAddonMissing } from '../lib/params.js'
import { rpc } from './socket.js'
import { store } from './store.js'

const READ_TIMEOUT_MS = 125_000 // sedikit lebih lama dari batas server (120 dtk): lewat radio, seribu lebih parameter bisa makan waktu semenit lebih

const set = (patch) => store.set(({ params }) => ({ params: { ...params, ...patch } }))

/**
 * Minta seluruh parameter autopilot: browser -> server -> bridge -> kendaraan. Hasilnya disimpan di store,
 * jadi tetap ada saat pindah halaman. Bila backend belum punya tambahan parameter, status menjadi 'missing'.
 */
export async function readParams() {
  set({ status: 'loading', text: '' })
  const reply = await rpc({ type: 'param.list' }, READ_TIMEOUT_MS)
  if (reply.ok) set({ status: 'ready', items: reply.data.params, text: reply.text, readAt: Date.now() })
  else set({ status: isAddonMissing(reply) ? 'missing' : 'error', text: reply.text })
}
