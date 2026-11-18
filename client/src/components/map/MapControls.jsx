import { useEffect, useState } from 'react'
import { Icon } from '../ui/Icon.jsx'

/** Kolom tombol di kanan atas peta. Berada di luar MapContainer, jadi klik tombol tidak pernah sampai ke peta. */
export default function MapControls({ map, panel, follow, onFollow }) {
  const [fullscreen, setFullscreen] = useState(false)

  useEffect(() => {
    const sync = () => setFullscreen(document.fullscreenElement === panel.current)
    document.addEventListener('fullscreenchange', sync)
    return () => document.removeEventListener('fullscreenchange', sync)
  }, [panel])

  const buttons = [
    { icon: 'plus', label: 'Zoom in', onClick: () => map.zoomIn() },
    { icon: 'minus', label: 'Zoom out', onClick: () => map.zoomOut() },
    { icon: 'locate', label: 'Follow vehicle', pressed: follow, onClick: () => onFollow(!follow) },
    { icon: 'layers', label: 'Layers and offline map', popoverTarget: 'layers' },
    { icon: 'expand', label: 'Fullscreen', pressed: fullscreen, onClick: () => (fullscreen ? document.exitFullscreen() : panel.current.requestFullscreen()) },
  ]

  return (
    <menu className="map-controls">
      {buttons.map(({ icon, label, pressed, ...props }) => (
        <li key={icon}>
          <button className="square" title={label} aria-label={label} aria-pressed={pressed} {...props}>
            <Icon name={icon} />
          </button>
        </li>
      ))}
    </menu>
  )
}
