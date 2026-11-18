import { useSyncExternalStore } from 'react'
import { readPref, writePref } from './prefs.js'

// Tema tampilan: 'dark' (bawaan) atau 'light'. Tema dipasang sebagai atribut data-theme di <html>;
// semua warna di styles/tokens.css mengikuti atribut itu. Skrip kecil di index.html memasangnya sebelum halaman tampil.
const KEY = 'gcs-theme'
const listeners = new Set()
let theme = readPref(KEY, 'dark') === 'light' ? 'light' : 'dark'

export const getTheme = () => theme

export function setTheme(next) {
  theme = next
  writePref(KEY, theme)
  document.documentElement.dataset.theme = theme
  document.querySelector('meta[name=color-scheme]')?.setAttribute('content', theme)
  listeners.forEach((notify) => notify())
}

export const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark')

const subscribe = (listener) => {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** Tema saat ini; komponen yang memakainya ikut berubah saat tema diganti. */
export const useTheme = () => useSyncExternalStore(subscribe, getTheme)
