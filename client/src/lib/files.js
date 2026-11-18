import { commandId, commandName, sanitize } from './mission.js'

const FRAME_RELATIVE = 3 // MAV_FRAME_GLOBAL_RELATIVE_ALT: tinggi relatif terhadap titik home
const round = (value, digits) => Number(Number(value).toFixed(digits))
const HOME = { lat: 0, lng: 0, alt: 0 }

// waypoints (Mission Planner / QGC WPL 110)
// Baris: seq  current  frame  command  p1 p2 p3 p4  lat  lng  alt  autocontinue

export const toWaypoints = (items, home = HOME) =>
  [
    'QGC WPL 110',
    [0, 1, 0, 16, 0, 0, 0, 0, round(home.lat, 7), round(home.lng, 7), round(home.alt, 2), 1],
    ...items.map(({ cmd, lat, lng, alt, params, frame }, i) => [i + 1, 0, frame ?? FRAME_RELATIVE, commandId(cmd), ...params, round(lat, 7), round(lng, 7), round(alt, 2), 1]),
  ]
    .map((row) => (Array.isArray(row) ? row.join('\t') : row))
    .join('\n')
    .concat('\n')

export function fromWaypoints(text) {
  const [header = '', ...rows] = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
  if (!header.startsWith('QGC WPL')) throw new Error('Not a .waypoints file (header "QGC WPL" not found)')
  const items = rows
    .map((row) => row.split(/\s+/).map(Number))
    .filter((cols) => cols.length >= 12 && cols[0] !== 0) // baris seq 0 adalah home
    .map(([, , frame, cmd, p1, p2, p3, p4, lat, lng, alt]) => ({ cmd: commandName(cmd), lat, lng, alt, params: [p1, p2, p3, p4], frame }))
  return sanitize(items)
}

//.plan (QGroundControl, JSON) 

export const toPlan = (items, home = HOME) =>
  JSON.stringify(
    {
      fileType: 'Plan',
      version: 1,
      groundStation: 'GCS',
      mission: {
        version: 2,
        firmwareType: 3,
        cruiseSpeed: 15,
        hoverSpeed: 5,
        plannedHomePosition: [home.lat, home.lng, home.alt],
        items: items.map(({ cmd, lat, lng, alt, params, frame }, i) => ({
          type: 'SimpleItem',
          command: commandId(cmd),
          doJumpId: i + 1,
          frame: frame ?? FRAME_RELATIVE,
          params: [...params, lat, lng, alt],
          autoContinue: true,
        })),
      },
      geoFence: { version: 2, circles: [], polygons: [] },
      rallyPoints: { version: 2, points: [] },
    },
    null,
    2,
  )

  // Item kompleks (survey QGC) dibuka menjadi item sederhana di dalamnya. 
const flatten = (items = []) => items.flatMap((item) => (item.type === 'ComplexItem' ? flatten(item.TransectStyleComplexItem?.Items) : [item]))

export function fromPlan(text) {
  const plan = JSON.parse(text)
  if (plan?.fileType !== 'Plan') throw new Error('Not a .plan file (fileType "Plan" not found)')
  const items = flatten(plan.mission?.items).map(({ command, frame, params = [], coordinate }) => {
    const [lat, lng, alt] = coordinate ?? params.slice(4, 7) // `coordinate` = format .plan lama
    return { cmd: commandName(command), lat, lng, alt, params: params.slice(0, 4), frame }
  })
  return sanitize(items)
}

// Pilih pembaca berdasarkan isi file: JSON -> .plan, selain itu -> .waypoints. 
export const parseMissionFile = (text) => (text.trimStart().startsWith('{') ? fromPlan(text) : fromWaypoints(text))

