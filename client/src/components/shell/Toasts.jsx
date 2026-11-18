import { useStore } from '../../state/store.js'
import { Icon } from '../ui/Icon.jsx'

/** Pemberitahuan singkat di atas peta; hilang sendiri setelah 5 detik (lihat state/events.js). */
export default function Toasts() {
  const toasts = useStore((s) => s.toasts)

  return (
    <output className="toasts" aria-live="polite">
      {toasts.map(({ id, level, text }) => (
        <p key={id} className={level === 'info' ? '' : level}>
          <Icon name={level === 'info' ? 'info' : 'warning'} size={18} />
          {text}
        </p>
      ))}
    </output>
  )
}
