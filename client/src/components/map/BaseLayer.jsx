import { useRef } from 'react'
import { TileLayer } from 'react-leaflet'
import { notify } from '../../state/events.js'
import { store } from '../../state/store.js'
import OfflineLayer from './OfflineLayer.jsx'

/** Peta dasar: ubin gambar dari internet, atau peta offline yang digambar sendiri. `base` = salah satu isi BASES. */
export default function BaseLayer({ base }) {
  const tiles = useRef({ name: '', loaded: 0, failed: 0 })
  if (base.offline) return <OfflineLayer />

  // Beberapa ubin gagal dan belum ada satu pun yang berhasil = kemungkinan besar tidak ada internet. Beri tahu sekali saja per peta.
  const count = (key) => () => {
    if (tiles.current.name !== base.name) tiles.current = { name: base.name, loaded: 0, failed: 0 }
    tiles.current[key] += 1
    if (tiles.current.failed !== 4 || tiles.current.loaded) return
    const saved = store.get().offline.areas > 0
    notify(saved ? 'Map pictures cannot be loaded. Open Layers and choose the Offline map.' : 'Map pictures cannot be loaded. Check the internet connection.', 'warn')
  }

  return (
    <TileLayer
      key={base.name}
      url={base.url}
      subdomains={base.subdomains}
      maxNativeZoom={base.maxZoom} // di atas zoom ini gambar terakhir diperbesar, jadi peta tidak tiba-tiba kosong
      maxZoom={20}
      eventHandlers={{ tileload: count('loaded'), tileerror: count('failed') }}
    />
  )
}
