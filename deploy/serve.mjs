#!/usr/bin/env node
/**
 * Статический сервер фронтенда «уДачный сад» (SPA).
 * Без зависимостей: node deploy/serve.mjs [порт] [каталог]
 * Хэшированные ассеты кэшируются навсегда, index.html и sw.js — никогда.
 * Плюс серверный помощник распознавания фото: POST /api/vision/… (vision.mjs).
 */
import { createServer } from 'node:http'
import { stat, readFile } from 'node:fs/promises'
import { extname, join, normalize } from 'node:path'
import { handleVision, VISION_PATH } from './vision.mjs'

const PORT = Number(process.argv[2] ?? 4173)
const ROOT = process.argv[3] ?? new URL('./dist', import.meta.url).pathname

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? '/', 'http://x')

    if (url.pathname === VISION_PATH) return await handleVision(req, res)
    if (url.pathname.startsWith('/api/')) {
      res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' })
      return res.end('{"ok":false,"error":"not-found"}')
    }

    // Защита от выхода за корень: normalize + join держат путь внутри ROOT.
    let path = normalize(decodeURIComponent(url.pathname)).replaceAll('..', '')
    let file = join(ROOT, path)

    let st = await stat(file).catch(() => null)
    if (!st || st.isDirectory()) {
      file = join(ROOT, 'index.html') // SPA-фолбэк
      st = await stat(file)
    }

    const ext = extname(file)
    const immutable = path.startsWith('/assets/')
    res.writeHead(200, {
      'Content-Type': MIME[ext] ?? 'application/octet-stream',
      'Content-Length': st.size,
      'Cache-Control': immutable ? 'public, max-age=31536000, immutable' : 'no-cache',
    })
    if (req.method === 'HEAD') return res.end()
    res.end(await readFile(file))
  } catch {
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' })
    res.end('Ошибка сервера')
  }
})

server.listen(PORT, '0.0.0.0', () => {
  console.log(`уДачный сад: статика из ${ROOT} на 0.0.0.0:${PORT}`)
})
