import { useRef } from 'react'
import { useChase } from '../../hooks/useChase.js'
import { cardinal } from '../../lib/format.js'
import { wrap360 } from '../../lib/geo.js'
import { vehicleKind, vehiclePath } from '../../lib/vehicle.js'
import { useStore } from '../../state/store.js'
import { paintAttitude } from './attitude.js'

const TICKS = Array.from({ length: 36 }, (_, i) => i * 10) // garis skala kompas tiap 10°
const LABELS = { 0: 'N', 30: '3', 60: '6', 90: 'E', 120: '12', 150: '15', 180: 'S', 210: '21', 240: '24', 270: 'W', 300: '30', 330: '33' }
const number = (value) => (Number.isFinite(value) ? value : 0) // belum ada data = 0

/**
 * Kompas dan indikator sikap, selalu di kanan bawah peta. `t` = frame telemetri langsung atau satu sampel rekaman.
 * Angka datang 5 kali per detik; useChase menghaluskannya sehingga jarum dan horizon bergerak mulus.
 */
export default function Instruments({ t, kind }) {
  const dial = useRef(null)
  const canvas = useRef(null)
  const heading = number(t.heading)

  useChase({ roll: number(t.roll), pitch: number(t.pitch), heading, speed: number(t.groundSpeed), alt: number(t.relAlt) }, (now) => {
    dial.current.style.transform = `rotate(${-now.heading}deg)` // kartu kompas berputar, penunjuk di atas tetap
    paintAttitude(canvas.current, now)
  }, ['heading'])

  return (
    <aside className="instruments" aria-label="Flight instruments">
      <figure className="compass">
        <svg viewBox="0 0 120 120" role="img" aria-label={`Heading ${Math.round(heading)} degrees`}>
          <circle className="face" cx="60" cy="60" r="58" />
          <g ref={dial} className="dial">
            {TICKS.map((deg) => <line key={deg} x1="60" y1="5" x2="60" y2={deg % 30 ? 9 : 12} transform={`rotate(${deg} 60 60)`} />)}
            {Object.entries(LABELS).map(([deg, text]) => (
              <text key={deg} x="60" y="25" className={deg === '0' ? 'north' : deg % 90 ? 'minor' : ''} transform={`rotate(${deg} 60 60)`}>{text}</text>
            ))}
          </g>
          <path className="pointer" d="M60 1 65.5 11h-11z" />
          <path className="craft" d={vehiclePath(kind)} transform="translate(39 39) scale(0.875)" />
        </svg>
        <figcaption>{String(Math.round(wrap360(heading)) % 360).padStart(3, '0')}° <span>{cardinal(heading)}</span></figcaption>
      </figure>
      <canvas ref={canvas} className="attitude" role="img" aria-label={`Roll ${number(t.roll).toFixed(0)}, pitch ${number(t.pitch).toFixed(0)} degrees`} />
    </aside>
  )
}

/** Instrumen untuk telemetri langsung. */
export function LiveInstruments() {
  const t = useStore((s) => s.t)
  return <Instruments t={t} kind={vehicleKind(t)} />
}
