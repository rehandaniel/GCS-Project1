import { store, useStore } from '../../state/store.js'
import { Icon } from '../ui/Icon.jsx'

const ICON = { info: 'info', warn: 'warning', bad: 'warning' }
const clock = (ms) => new Date(ms).toLocaleTimeString('en-GB')

/** Daftar pesan kendaraan dan sistem. Memakai Popover API bawaan browser: tombol lonceng membukanya tanpa state React. */
export default function Messages() {
  const events = useStore((s) => s.events)

  return (
    <aside id="messages" className="menu messages" popover="auto" onToggle={(e) => e.newState === 'open' && store.set({ unread: 0 })}>
      <h2>Messages</h2>
      {events.length === 0 && <p className="muted">Nothing yet. Vehicle status messages appear here.</p>}
      <ul>
        {events.map(({ id, t, level, text }) => (
          <li key={id} className={level === 'info' ? '' : level}>
            <Icon name={ICON[level]} size={16} />
            <span>{text}</span>
            <time dateTime={new Date(t).toISOString()}>{clock(t)}</time>
          </li>
        ))}
      </ul>
    </aside>
  )
}
