// Menggambar satu ubin (kotak 256 x 256 piksel) peta offline di canvas, dari data yang disiapkan lib/offline.js.
// Leaflet meminta ubin satu per satu sesuai bagian peta yang terlihat (lihat components/map/OfflineLayer.jsx).

import { overlaps } from './offline.js'

/** Warna peta offline mengikuti tema aplikasi. */
export const PAPER = {
  light: { empty: '#dfe3e8', land: '#eef0ea', green: '#cfe2c1', water: '#a8cdee', building: '#d9d4cb', edge: '#bfb9ad', casing: '#b4aea2', minor: '#ffffff', major: '#f7dc8f', runway: '#aab1bd', path: '#8f8572', border: '#59636e' },
  dark: { empty: '#0c1117', land: '#17202a', green: '#1c3226', water: '#173a55', building: '#27323e', edge: '#35424f', casing: '#0c1117', minor: '#3c4957', major: '#77642f', runway: '#5a6675', path: '#566371', border: '#8e9aa7' },
}

// Urutan menggambar dari bawah ke atas. `from` = mulai tampil di zoom berapa; `width` = lebar garis (piksel) di zoom 16.
const LAYERS = [
  { kind: 'green', fill: 'green' },
  { kind: 'water', fill: 'water' },
  { kind: 'stream', stroke: 'water', width: 2.5, from: 12 },
  { kind: 'building', fill: 'building', outline: 'edge', from: 15 },
  { kind: 'minor', stroke: 'casing', width: 5, from: 14 },
  { kind: 'major', stroke: 'casing', width: 8.5, from: 13 },
  { kind: 'minor', stroke: 'minor', width: 3.5, from: 13 },
  { kind: 'major', stroke: 'major', width: 7 },
  { kind: 'runway', stroke: 'runway', width: 14, exact: true },
  { kind: 'path', stroke: 'path', width: 1.2, from: 15, dash: [4, 3] },
]

/** Lebar garis di zoom `z`. Jalan menyempit pelan-pelan saat peta dijauhkan supaya tetap terlihat; landasan (`exact`) mengikuti skala asli. */
const widthAt = (z, { width, exact }) => Math.max(0.7, width * (exact ? 2 : 1.6) ** (z - 16))

/** Gambar satu ubin. `coords` = { x, y, z } nomor ubin, `areas` = hasil prepareArea(), `paper` = salah satu PAPER. */
export function paintTile(ctx, { x, y, z }, areas, paper, size = 256) {
  const world = size * 2 ** z // lebar peta dunia dalam piksel pada zoom ini
  const [left, top] = [x * size, y * size] // pojok kiri atas ubin ini pada peta dunia
  const tile = [left / world, top / world, (left + size) / world, (top + size) / world]
  const here = areas.filter((area) => overlaps(area.box, tile))

  ctx.fillStyle = paper.empty // di luar area tersimpan: kosong
  ctx.fillRect(0, 0, size, size)
  ctx.fillStyle = paper.land
  for (const { box } of here) ctx.fillRect(box[0] * world - left, box[1] * world - top, (box[2] - box[0]) * world, (box[3] - box[1]) * world)

  ctx.lineJoin = ctx.lineCap = 'round'
  for (const layer of LAYERS) {
    if (z < (layer.from ?? 0)) continue
    ctx.beginPath()
    for (const area of here) {
      for (const { xy, box } of area.byKind[layer.kind] ?? []) {
        if (!overlaps(box, tile)) continue
        ctx.moveTo(xy[0] * world - left, xy[1] * world - top)
        for (let i = 2; i < xy.length; i += 2) ctx.lineTo(xy[i] * world - left, xy[i + 1] * world - top)
      }
    }
    if (layer.fill) {
      ctx.fillStyle = paper[layer.fill]
      ctx.fill()
    }
    const color = layer.stroke ?? layer.outline
    if (!color) continue
    ctx.strokeStyle = paper[color]
    ctx.lineWidth = layer.stroke ? widthAt(z, layer) : 1
    ctx.setLineDash(layer.dash ?? [])
    ctx.stroke()
  }

  ctx.strokeStyle = paper.border // garis putus-putus = batas area yang tersimpan
  ctx.lineWidth = 1
  ctx.setLineDash([6, 6])
  for (const { box } of here) ctx.strokeRect(box[0] * world - left, box[1] * world - top, (box[2] - box[0]) * world, (box[3] - box[1]) * world)
  ctx.setLineDash([])
}
