const request = async (url, options) => {
  const response = await fetch(url, options)
  if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error ?? `HTTP ${response.status}`)
  return response.status === 204 ? null : response.json()
}
const send = (method, body) => ({ method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })

// Pembungkus tipis untuk REST API server: misi dan penerbangan (database SQL), serta file .tlog. 
export const api = {
  missions: () => request('/api/missions'),
  mission: (id) => request(`/api/missions/${id}`),
  createMission: (body) => request('/api/missions', send('POST', body)),
  updateMission: (id, body) => request(`/api/missions/${id}`, send('PUT', body)),
  deleteMission: (id) => request(`/api/missions/${id}`, { method: 'DELETE' }),
  logs: () => request('/api/logs'),
  uploadLog: (file) => request(`/api/logs?name=${encodeURIComponent(file.name)}`, { method: 'POST', headers: { 'content-type': 'application/octet-stream' }, body: file }),
  flights: () => request('/api/flights'),
  flight: (id) => request(`/api/flights/${id}`),
  importFlight: (log) => request('/api/flights', send('POST', { log })),
  deleteFlight: (id) => request(`/api/flights/${id}`, { method: 'DELETE' }),
}