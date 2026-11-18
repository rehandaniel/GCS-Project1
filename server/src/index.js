import { config } from './config.js'
import { createServer } from './server.js'

const server = await createServer(config)
const port = await server.start()
console.log(`GCS server on http://${config.host}:${port} (redis: ${config.redisUrl}, logs: ${config.logDir}, database: ${config.dbPath})`)

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.once(signal, async () => {
    await server.stop()
    process.exit(0)
  })
}