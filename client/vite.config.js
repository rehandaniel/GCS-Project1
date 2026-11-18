import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const server = 'http://127.0.0.1:3001' //Express + Socket.IO (npm run dev -w server)
export default defineConfig({
    plugins: [react()],
    server: { port: 5173, proxy:{ '/api': server, '/socket.io': { target: server, ws: true}}},
})