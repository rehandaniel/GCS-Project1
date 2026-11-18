// Jenis kendaraan: nama dan bentuk ikonnya.
// Bridge mengirim dua petunjuk di setiap frame telemetri: `mavType` (angka MAV_TYPE dari MAVLink) dan `type` (kelompok besar).
// Semua ikon digambar di kotak 48 x 48, dilihat dari atas, dengan hidung menghadap ke atas, supaya bisa diputar mengikuti arah.

/** Daftar jenis yang dikenal. `rotors` = jumlah baling-baling (untuk multirotor), `fast` = pesawat bersayap (kecepatan lebih tinggi). */
export const VEHICLES = {
  plane: { name: 'Plane', fast: true },
  vtol: { name: 'VTOL plane', fast: true },
  heli: { name: 'Helicopter' },
  tri: { name: 'Tricopter', rotors: 3 },
  quad: { name: 'Quadcopter', rotors: 4 },
  hexa: { name: 'Hexacopter', rotors: 6 },
  octo: { name: 'Octocopter', rotors: 8 },
  deca: { name: 'Decacopter', rotors: 10 },
  dodeca: { name: 'Dodecacopter', rotors: 12 },
  rover: { name: 'Rover' },
  boat: { name: 'Boat' },
  sub: { name: 'Submarine' },
  other: { name: 'Vehicle' },
}

// Angka MAV_TYPE (standar MAVLink) -> jenis di atas. 19 sampai 25 adalah berbagai macam VTOL.
const BY_MAV_TYPE = {
  1: 'plane', 2: 'quad', 3: 'heli', 4: 'heli', 10: 'rover', 11: 'boat', 12: 'sub', 13: 'hexa', 14: 'octo', 15: 'tri',
  19: 'vtol', 20: 'vtol', 21: 'vtol', 22: 'vtol', 23: 'vtol', 24: 'vtol', 25: 'vtol', 29: 'dodeca', 35: 'deca', 43: 'quad',
}
// Cadangan bila angkanya tidak dikenal: kelompok besar dari bridge.
const BY_GROUP = { copter: 'quad', plane: 'plane', rover: 'rover', sub: 'sub' }

/** Jenis kendaraan dari satu frame telemetri. Selalu mengembalikan salah satu kunci VEHICLES. */
export const vehicleKind = ({ mavType, type } = {}) => BY_MAV_TYPE[mavType] ?? BY_GROUP[type] ?? 'other'

// ---- bentuk ikon ------------------------------------------------------------------------------
// Tiap ikon adalah satu "path" SVG. Semua bagian digambar searah jarum jam supaya menyatu;
// bagian yang digambar berlawanan arah (`hole`) menjadi lubang.

const n = (value) => Number(value.toFixed(2))
const disc = (cx, cy, r, hole = false) => {
  const sweep = hole ? 0 : 1
  return `M${n(cx - r)} ${n(cy)}a${r} ${r} 0 1 ${sweep} ${n(2 * r)} 0a${r} ${r} 0 1 ${sweep} ${n(-2 * r)} 0z`
}
const box = (x, y, w, h, r = 0) =>
  `M${x + r} ${y}h${w - 2 * r}a${r} ${r} 0 0 1 ${r} ${r}v${h - 2 * r}a${r} ${r} 0 0 1 ${-r} ${r}h${-(w - 2 * r)}a${r} ${r} 0 0 1 ${-r} ${-r}v${-(h - 2 * r)}a${r} ${r} 0 0 1 ${r} ${-r}z`

/** Batang lurus selebar `width` dari titik (x1, y1) ke (x2, y2): lengan drone dan bilah baling-baling. */
const bar = (x1, y1, x2, y2, width) => {
  const length = Math.hypot(x2 - x1, y2 - y1)
  const [px, py] = [(-(y2 - y1) / length) * (width / 2), ((x2 - x1) / length) * (width / 2)] // arah tegak lurus batang
  return `M${n(x1 - px)} ${n(y1 - py)}L${n(x2 - px)} ${n(y2 - py)}L${n(x2 + px)} ${n(y2 + py)}L${n(x1 + px)} ${n(y1 + py)}z`
}

const ARROW = 'M24 13.5 29.5 28 24 25 18.5 28z' // badan berbentuk panah: menunjukkan arah depan
const PLANE = 'M24 3C26 3 27.2 6 27.2 10L27.2 17.5 45 26.5 45 30.5 27.2 27 26.4 37 33 41.5 33 44.5 24 42.5 15 44.5 15 41.5 21.6 37 20.8 27 3 30.5 3 26.5 20.8 17.5 20.8 10C20.8 6 22 3 24 3z'

/** Drone dengan `count` baling-baling yang tersebar rata mengelilingi badan. */
function multirotor(count) {
  const reach = 15.5 // jarak baling-baling dari pusat
  const gap = 2 * reach * Math.sin(Math.PI / count) // jarak antara dua baling-baling bertetangga
  const radius = Math.min(6.6, 0.36 * gap) // makin banyak baling-baling, makin kecil, supaya tidak saling menempel
  const rotors = Array.from({ length: count }, (_, i) => {
    const angle = ((i + 0.5) * 2 * Math.PI) / count // 0 = depan; baling-baling selalu berpasangan kiri-kanan
    return [24 + reach * Math.sin(angle), 24 - reach * Math.cos(angle)]
  })
  return rotors.map(([x, y]) => bar(24, 24, x, y, 2.6) + disc(x, y, n(radius))).join('') + ARROW
}

const SHAPES = {
  plane: PLANE,
  vtol: PLANE + [12, 36].map((x) => box(x - 1.2, 11, 2.4, 28) + disc(x, 11, 4.4) + disc(x, 39, 4.4)).join(''),
  heli: `${box(19, 9, 10, 20, 5)}${box(22.9, 27, 2.2, 15)}${box(19, 40.5, 10, 2.6, 1.3)}${bar(8, 7, 40, 31, 2.6)}${bar(40, 7, 8, 31, 2.6)}`,
  rover: `${box(15, 8, 18, 32, 4)}${[10, 28].map((y) => box(9, y, 5.5, 10, 2) + box(33.5, y, 5.5, 10, 2)).join('')}M24 12 19.5 19 28.5 19z`,
  boat: `M24 3C30 8 34 15 34 22L33 41a2 2 0 0 1-2 2L17 43a2 2 0 0 1-2-2L14 22C14 15 18 8 24 3z${disc(24, 22, 3.2, true)}M20 30 20 37 28 37 28 30z`,
  sub: `${box(19, 3, 10, 42, 5)}${box(12, 12, 24, 3.4, 1.7)}${box(15, 36, 18, 3.4, 1.7)}${disc(24, 21, 2.6, true)}`,
  other: 'M24 4 38 43 24 35 10 43z',
}

/** Bentuk ikon (isi atribut `d` pada <path>) untuk satu jenis kendaraan. */
export const vehiclePath = (kind) => SHAPES[kind] ?? (VEHICLES[kind]?.rotors ? multirotor(VEHICLES[kind].rotors) : SHAPES.other)
