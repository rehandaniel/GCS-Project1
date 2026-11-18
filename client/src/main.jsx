import '@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css'
import 'leaflet/dist/leaflet.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import { startDemo } from './dev/demo.js'
import { loadOffline } from './state/offline.js'
import { startSocket } from './state/socket.js'
import './styles/fonts.css'
import './styles/tokens.css'
import './styles/base.css'
import './styles/shell.css'
import './styles/map.css'
import './styles/fly.css'
import './styles/plan.css'
import './styles/pages.css'

// Titik masuk aplikasi: pasang sumber data, lalu gambar <App />.
// ?demo hanya berlaku di `npm run dev`: telemetri palsu untuk mengembangkan tampilan tanpa kendaraan (?demo=plane, ?demo=rover, ...).
const demo = new URLSearchParams(location.search).get('demo')
if (import.meta.env.DEV && demo !== null) startDemo(demo)
else startSocket() // sambungan Socket.IO ke server: telemetri masuk, perintah keluar

loadOffline() // area peta offline yang pernah disimpan di browser

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
