import { toggleTheme, useTheme } from '../../state/theme.js'
import { Icon } from '../ui/Icon.jsx'

// Menu utama di sisi kiri. Menambah halaman baru: tambah satu baris di sini dan satu cabang di App.jsx.
const VIEWS = [
  { id: 'fly', label: 'Fly', icon: 'plane' },
  { id: 'plan', label: 'Plan', icon: 'route' },
  { id: 'logs', label: 'Logs', icon: 'file' },
  { id: 'params', label: 'Params', icon: 'sliders' },
]

export default function Rail({ view, onView }) {
  const theme = useTheme()
  const other = theme === 'dark' ? 'light' : 'dark'

  return (
    <nav className="rail" aria-label="Main">
      <span className="logo" aria-hidden="true">GCS</span>
      <ul>
        {VIEWS.map(({ id, label, icon }) => (
          <li key={id}>
            <button aria-current={view === id} onClick={() => onView(id)}>
              <Icon name={icon} />
              {label}
            </button>
          </li>
        ))}
      </ul>
      <button aria-label={`Switch to ${other} mode`} title={`Switch to ${other} mode`} onClick={toggleTheme}>
        <Icon name={theme === 'dark' ? 'sun' : 'moon'} />
        {theme === 'dark' ? 'Light' : 'Dark'}
      </button>
    </nav>
  )
}
