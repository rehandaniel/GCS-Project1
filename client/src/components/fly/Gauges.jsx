import { clamp } from '../../lib/geo.js'

const CENTER = { x: 60, y: 62 }
const polar = (deg, radius) => ({ x: CENTER.x + radius * Math.cos((deg * Math.PI) / 180), y: CENTER.y - radius * Math.sin((deg * Math.PI) / 180) })

/** Gauge setengah lingkaran: lengkung hijau → kuning → oranye, jarum menunjuk nilai. `ratio` 0..1 dari batas gauge. */
export function SpeedGauge({ ratio }) {
  const angle = (clamp(ratio, 0, 1) - 0.5) * 180 // jarum lurus ke atas = 50%
  return (
    <svg viewBox="0 0 120 70" role="img" aria-label={`Speed at ${Math.round(ratio * 100)}% of the gauge range`}>
      <defs>
        <linearGradient id="speed-arc" gradientUnits="userSpaceOnUse" x1="12" x2="108">
          <stop offset="0" stopColor="var(--ok)" />
          <stop offset="0.55" stopColor="var(--warn)" />
          <stop offset="1" stopColor="var(--serious)" />
        </linearGradient>
      </defs>
      <path d="M12 62A48 48 0 0 1 108 62" fill="none" stroke="url(#speed-arc)" strokeWidth="8" strokeLinecap="round" />
      {Array.from({ length: 11 }, (_, i) => {
        const [a, b] = [polar(180 - i * 18, 38), polar(180 - i * 18, i % 5 ? 34 : 31)]
        return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="var(--muted)" strokeWidth="1.5" />
      })}
      <g className="needle" style={{ transform: `rotate(${angle}deg)`, transformOrigin: `${CENTER.x}px ${CENTER.y}px` }}>
        <line x1={CENTER.x} y1={CENTER.y} x2={CENTER.x} y2="26" stroke="var(--ink)" strokeWidth="3" strokeLinecap="round" />
      </g>
      <circle cx={CENTER.x} cy={CENTER.y} r="5" fill="var(--ink)" />
    </svg>
  )
}

/** Lingkaran berisi cairan: tinggi cairan = persen baterai. `tone` (ok/warn/bad) mewarnai cairan, kosong = abu-abu. */
export function LiquidGauge({ pct, tone }) {
  const level = pct == null ? 0 : clamp(pct, 0, 100)
  const top = 90 - level * 0.8 // 0% = dasar lingkaran (y 90), 100% = puncak (y 10)
  return (
    <svg viewBox="0 0 100 100" className={tone} role="img" aria-label={pct == null ? 'Battery unknown' : `Battery ${pct}%`}>
      <clipPath id="liquid-clip"><circle cx="50" cy="50" r="40" /></clipPath>
      <circle cx="50" cy="50" r="40" fill="var(--raised)" />
      <g clipPath="url(#liquid-clip)">
        {/* ombak selebar 200 (lingkarannya 80): tetap menutup lingkaran saat digeser animasi */}
        <path className="liquid" fill="var(--tone, var(--muted))" d={`M-50 ${top}q12.5-6 25 0${'t25 0'.repeat(7)}V110H-50Z`} />
      </g>
      <circle cx="50" cy="50" r="40" fill="none" stroke="var(--line)" strokeWidth="2" />
      <text x="50" y="57" textAnchor="middle" fontSize="21" fontWeight="700" fill="var(--ink)" stroke="var(--tile)" strokeWidth="3.5" paintOrder="stroke">
        {pct == null ? '—' : `${pct}%`}
      </text>
    </svg>
  )
}
