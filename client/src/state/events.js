import { store } from './store.js'

let nextId = 1

// Catat pesan di daftar pesan (lonceng). `t` dalam milidetik, sama dengan pesan dari bridge. Peringatan dan error juga menambah penghitung belum-dibaca. 
export const addEvent = ({ t = Date.now(), level = 'info', text }) => {
  store.set(({ events, unread }) => ({
    events: [{ id: nextId++, t, level, text }, ...events].slice(0, 100),
    unread: unread + (level === 'info' ? 0 : 1),
  }))
  if (level !== 'info') notify(text, level)
}

// Toast singkat di pojok layar; hilang sendiri setelah 5 detik. 
export const notify = (text, level = 'info') => {
  const id = nextId++
  store.set(({ toasts }) => ({ toasts: [...toasts.slice(-3), { id, level, text }] }))
  setTimeout(() => store.set(({ toasts }) => ({ toasts: toasts.filter((toast) => toast.id !== id) })), 5000)
}
