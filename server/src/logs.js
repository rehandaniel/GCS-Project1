import fs from 'node:fs/promises'
import path from 'node:path'
import express from 'express'

export const LOG_NAME = /^[\w.-]+\.tlog$/ // tidak boleh ada "/" sehingga tidak bisa keluar dari folder log
const MAX_UPLOAD = '100mb'

/** Nama file unggahan -> nama aman di folder log, atau null bila bukan .tlog. */
const safeName = (raw) => {
  const name = path.basename(String(raw ?? '')).replace(/[^\w.-]/g, '_')
  return LOG_NAME.test(name) ? name : null
}

/** Daftar, unduh, dan unggah file .tlog. File hasil rekaman bridge ada di folder yang sama. */
export function logsRouter(logDir) {
  const router = express.Router()

  router.get('/', async (req, res) => {
    const names = (await fs.readdir(logDir).catch(() => [])).filter((name) => LOG_NAME.test(name))
    const logs = await Promise.all(
      names.map(async (name) => {
        const { size, mtimeMs } = await fs.stat(path.join(logDir, name))
        return { name, size, modifiedAt: mtimeMs }
      }),
    )
    res.json(logs.sort((a, b) => b.modifiedAt - a.modifiedAt))
  })

  // Buka .tlog dari komputer ini (mis. dari Mission Planner): disalin ke folder log, lalu bisa diimpor ke database
  router.post('/', express.raw({ type: 'application/octet-stream', limit: MAX_UPLOAD }), async (req, res) => {
    const wanted = safeName(req.query.name)
    if (!wanted || !Buffer.isBuffer(req.body) || !req.body.length) {
      return res.status(400).json({ error: 'Send the file as application/octet-stream to /api/logs?name=<file>.tlog' })
    }
    await fs.mkdir(logDir, { recursive: true })
    // flag 'wx' menolak menimpa: nama yang sudah ada diberi akhiran waktu
    const name = await fs.writeFile(path.join(logDir, wanted), req.body, { flag: 'wx' }).then(
      () => wanted,
      async (error) => {
        if (error.code !== 'EEXIST') throw error
        const unique = wanted.replace(/\.tlog$/, `-${Date.now()}.tlog`)
        await fs.writeFile(path.join(logDir, unique), req.body, { flag: 'wx' })
        return unique
      },
    )
    res.status(201).json({ name })
  })

  router.get('/:name', (req, res) => {
    if (!LOG_NAME.test(req.params.name)) return res.status(400).json({ error: 'Invalid log name' })
    res.download(req.params.name, { root: logDir }, (error) => {
      if (error && !res.headersSent) res.status(404).json({ error: 'Log not found' })
    })
  })

  return router
}