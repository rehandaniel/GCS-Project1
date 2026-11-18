// Gambar indikator sikap (artificial horizon) di canvas: langit dan tanah yang miring mengikuti roll dan pitch, tangga pitch,
// skala kemiringan, simbol pesawat, pita arah, serta kotak kecepatan dan tinggi. Tiap bagian satu fungsi kecil.

export const [W, H] = [280, 190] // ukuran gambar dalam piksel CSS
const [CX, CY] = [W / 2, 104] // titik tengah horizon
const PX_PER_DEG = 3.5 // skala tangga pitch
const TAPE_PX_PER_DEG = 2.6
const ARC = 70 // jari-jari skala kemiringan
const RAD = Math.PI / 180
const COLOR = { sky: '#2f7fc0', ground: '#7c5a2c', line: '#ffffff', plane: '#f7b021', text: '#d4ffd4', box: 'rgb(0 0 0 / 0.55)' }
const FONT = 'B612, system-ui, sans-serif'
const BANK_MARKS = [-60, -45, -30, -20, -10, 0, 10, 20, 30, 45, 60]
const LADDER = [-30, -20, -10, 10, 20, 30]
const CARDINAL = { 0: 'N', 90: 'E', 180: 'S', 270: 'W' }

const label = (ctx, value, x, y) => {
  ctx.textAlign = 'center'
  ctx.fillText(value, x, y)
}

/** Pindahkan titik gambar ke horizon: diputar -roll, lalu digeser sebesar pitch searah sumbu pesawat. */
function tilt(ctx, { roll, pitch }) {
  ctx.translate(CX, CY)
  ctx.rotate(-roll * RAD)
  ctx.translate(0, pitch * PX_PER_DEG)
}

/** Langit di atas garis horizon, tanah di bawahnya. */
function horizon(ctx, now) {
  ctx.save()
  tilt(ctx, now)
  ctx.fillStyle = COLOR.sky
  ctx.fillRect(-W, -H * 2, W * 2, H * 2)
  ctx.fillStyle = COLOR.ground
  ctx.fillRect(-W, 0, W * 2, H * 2)
  ctx.strokeStyle = COLOR.line
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(-W, 0)
  ctx.lineTo(W, 0)
  ctx.stroke()
  ctx.restore()
}

/** Tangga pitch: garis tiap 10° dengan angka di 20° dan 30°. Dipotong di dalam lingkaran supaya tidak menabrak skala kemiringan. */
function ladder(ctx, now) {
  ctx.save()
  ctx.beginPath()
  ctx.arc(CX, CY, ARC - 8, 0, 2 * Math.PI)
  ctx.clip()
  tilt(ctx, now)
  ctx.strokeStyle = ctx.fillStyle = COLOR.line
  ctx.lineWidth = 2
  ctx.beginPath()
  LADDER.forEach((deg) => {
    const half = deg % 20 ? 16 : 26
    ctx.moveTo(-half, -deg * PX_PER_DEG)
    ctx.lineTo(half, -deg * PX_PER_DEG)
  })
  ctx.stroke()
  ctx.font = `10px ${FONT}`
  LADDER.filter((deg) => deg % 20 === 0).forEach((deg) => label(ctx, Math.abs(deg), 40, -deg * PX_PER_DEG + 3.5))
  ctx.restore()
}

/** Skala kemiringan (roll) tetap di layar; segitiga penunjuk ikut berputar bersama horizon. */
function bankScale(ctx, roll) {
  ctx.save()
  ctx.translate(CX, CY)
  ctx.strokeStyle = COLOR.line
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.arc(0, 0, ARC, -150 * RAD, -30 * RAD)
  ctx.stroke()
  BANK_MARKS.forEach((deg) => {
    ctx.save()
    ctx.rotate(deg * RAD)
    ctx.beginPath()
    ctx.moveTo(0, -ARC)
    ctx.lineTo(0, deg % 30 ? -ARC - 5 : -ARC - 10)
    ctx.stroke()
    ctx.restore()
  })
  ctx.rotate(-roll * RAD)
  ctx.fillStyle = COLOR.plane
  ctx.beginPath()
  ctx.moveTo(0, -ARC + 2)
  ctx.lineTo(-6, -ARC + 13)
  ctx.lineTo(6, -ARC + 13)
  ctx.fill()
  ctx.restore()
}

/** Simbol pesawat tetap di tengah layar. */
function aircraft(ctx) {
  ctx.strokeStyle = ctx.fillStyle = COLOR.plane
  ctx.lineWidth = 4
  ctx.lineJoin = 'round'
  ctx.beginPath()
  ;[-1, 1].forEach((side) => {
    ctx.moveTo(CX + side * 56, CY)
    ctx.lineTo(CX + side * 20, CY)
    ctx.lineTo(CX + side * 20, CY + 8)
  })
  ctx.stroke()
  ctx.fillRect(CX - 3, CY - 3, 6, 6)
}

/** Pita arah di atas: tanda tiap 5°, angka tiap 30° (N/E/S/W di arah mata angin). */
function headingTape(ctx, heading) {
  ctx.fillStyle = COLOR.box
  ctx.fillRect(0, 0, W, 24)
  ctx.strokeStyle = ctx.fillStyle = COLOR.line
  ctx.lineWidth = 1.5
  ctx.font = `11px ${FONT}`
  Array.from({ length: 115 }, (_, i) => Math.floor(heading) - 57 + i)
    .filter((deg) => deg % 5 === 0)
    .forEach((deg) => {
      const x = CX + (deg - heading) * TAPE_PX_PER_DEG
      const compass = ((deg % 360) + 360) % 360
      ctx.beginPath()
      ctx.moveTo(x, 24)
      ctx.lineTo(x, compass % 10 ? 20 : 17)
      ctx.stroke()
      if (compass % 30 === 0) label(ctx, CARDINAL[compass] ?? compass, x, 12)
    })
  ctx.fillStyle = COLOR.plane
  ctx.beginPath()
  ctx.moveTo(CX, 25)
  ctx.lineTo(CX - 6, 33)
  ctx.lineTo(CX + 6, 33)
  ctx.fill()
}

const readout = (ctx, name, value, x) => {
  ctx.fillStyle = COLOR.box
  ctx.fillRect(x, H - 28, 84, 21)
  ctx.fillStyle = COLOR.text
  ctx.font = `12px ${FONT}`
  label(ctx, `${name} ${value}`, x + 42, H - 13.5)
}

/** Gambar satu frame. `now` = { roll, pitch, heading, speed, alt }. Canvas dibuat lebih rapat di layar retina supaya tajam. */
export function paintAttitude(canvas, now) {
  if (!canvas.offsetParent) return // sedang disembunyikan (halaman lain dibuka): tidak perlu digambar
  const sharp = window.devicePixelRatio || 1
  if (canvas.width !== W * sharp) [canvas.width, canvas.height] = [W * sharp, H * sharp]
  const ctx = canvas.getContext('2d')
  ctx.setTransform(sharp, 0, 0, sharp, 0, 0)
  ctx.clearRect(0, 0, W, H)
  horizon(ctx, now)
  ladder(ctx, now)
  bankScale(ctx, now.roll)
  aircraft(ctx)
  headingTape(ctx, now.heading)
  readout(ctx, 'GS', now.speed.toFixed(1), 8)
  readout(ctx, 'ALT', now.alt.toFixed(1), W - 92)
}
