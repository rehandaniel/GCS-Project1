import { useSyncExternalStore } from 'react'

// Store mini: satu objek state, `set` untuk mengubahnya, `subscribe` untuk didengar React.
const createStore = (initial) => {
  let state = initial
  const listeners = new Set()
  return {
    get: () => state,
    set(patch) {
      state = { ...state, ...(typeof patch === 'function' ? patch(state) : patch) }
      listeners.forEach((notify) => notify())
    },
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }
}

// Bentuk frame telemetri sebelum ada data. Nama field sama dengan frame dari bridge Python (bridge/gcs_bridge/state.py).
export const EMPTY_FRAME = {
  link: 'disconnected', connection: '', sysid: 0, compid: 0, type: 'other', mavType: 0, autopilot: '', firmware: '',
  armed: false, mode: '', modes: [],
  lat: null, lng: null, alt: 0, relAlt: 0, groundSpeed: 0, airSpeed: 0, climb: 0, heading: 0, throttle: 0,
  roll: 0, pitch: 0, yaw: 0, batteryPct: null, batteryVolt: null, batteryCurrent: null,
  gpsFix: 0, gpsFixText: 'No GPS', sats: 0, hdop: null, homeLat: null, homeLng: null, homeDist: null,
  wp: 0, wpDist: 0, linkAge: 0, rate: 0, recording: false,
}

export const store = createStore({
  online: false, // browser <-> server (Socket.IO)
  bridge: false, // server <-> bridge Python
  demo: false,
  t: EMPTY_FRAME, // telemetri terakhir
  track: [], // jejak terbang [{ lat, lng }]
  events: [], // pesan kendaraan dan sistem, terbaru di depan
  unread: 0,
  toasts: [],
  mission: { id: null, name: 'Untitled mission', items: [] },
  selectedId: null,
  planAlt: 20, // tinggi bawaan waypoint baru (m, relatif terhadap home)
  surveyArea: 0, // luas poligon survey yang sedang digambar (m²), 0 = tidak ada
  params: { status: 'idle', items: [], text: '', readAt: 0 }, // parameter autopilot; status: idle | loading | ready | missing | error
  offline: { areas: 0, objects: 0, busy: false }, // ringkasan peta offline yang tersimpan di browser (datanya sendiri ada di state/offline.js)
})

// Baca satu potongan state. `select` harus mengembalikan nilai yang stabil (angka, string, atau objek yang sama).
export const useStore = (select) => useSyncExternalStore(store.subscribe, () => select(store.get()))
