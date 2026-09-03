/**
 * Живой PocketBase: create/update entries режет вырезанные etype и disease без фото.
 * Скачивает официальный бинарник в /tmp (не в репозиторий) и поднимает
 * временную базу с миграциями и pb_hooks из этого дерева.
 */
import { createRequire } from 'node:module'
import { createWriteStream, existsSync, mkdirSync } from 'node:fs'
import { chmod, mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { pipeline } from 'node:stream/promises'
import { fileURLToPath } from 'node:url'
import { spawn } from 'node:child_process'
import { createHash } from 'node:crypto'
import { after, before, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { Readable } from 'node:stream'

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)))
const BACKEND = join(ROOT, 'backend')
const require = createRequire(import.meta.url)
const policy = require(join(BACKEND, 'pb_hooks/entries_etype.js'))

const PB_VERSION = '0.28.4'
const PIXEL_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64',
)

const EMAIL = 'etype-hook@test.udacha.local'
const PASSWORD = 'etype-pass-12345'
const SUPER_EMAIL = 'etype-super@test.udacha.local'
const SUPER_PASSWORD = 'etype-super-12345'

let pbDir
let proc
let base
let token
let plantingId
let pruneId

function archZip() {
  const arch = process.arch === 'arm64' ? 'arm64' : 'amd64'
  return `pocketbase_${PB_VERSION}_linux_${arch}.zip`
}

async function ensurePocketBase() {
  const dest = join(tmpdir(), `pocketbase-${PB_VERSION}`)
  const bin = join(dest, 'pocketbase')
  if (existsSync(bin)) return bin
  mkdirSync(dest, { recursive: true })
  const url = `https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/${archZip()}`
  const zipPath = join(dest, 'pb.zip')
  const res = await fetch(url, { redirect: 'follow' })
  if (!res.ok) throw new Error(`download pocketbase: ${res.status} ${url}`)
  await pipeline(Readable.fromWeb(res.body), createWriteStream(zipPath))
  const { execFileSync } = await import('node:child_process')
  execFileSync('unzip', ['-o', zipPath, '-d', dest])
  await chmod(bin, 0o755)
  return bin
}

async function waitHealth(url, ms = 20000) {
  const end = Date.now() + ms
  while (Date.now() < end) {
    try {
      const res = await fetch(url + '/api/health')
      if (res.ok) return
    } catch {
      // ещё поднимается
    }
    await new Promise((r) => setTimeout(r, 150))
  }
  throw new Error('PocketBase не поднялся')
}

async function api(path, opts = {}, auth) {
  const res = await fetch(base + path, {
    ...opts,
    headers: {
      ...(opts.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...(auth ? { Authorization: auth } : {}),
      ...(opts.headers || {}),
    },
  })
  const body = await res.json().catch(() => ({}))
  return { res, body }
}

function json(method, path, data, auth) {
  return api(path, { method, body: JSON.stringify(data) }, auth)
}

before(async () => {
  const bin = await ensurePocketBase()
  pbDir = await mkdtemp(join(tmpdir(), 'udacha-etype-'))
  const port = 18000 + (createHash('sha1').update(pbDir).digest().readUInt16BE(0) % 1000)
  base = `http://127.0.0.1:${port}`

  const upsert = spawn(
    bin,
    [
      'superuser',
      'upsert',
      SUPER_EMAIL,
      SUPER_PASSWORD,
      '--dir',
      join(pbDir, 'pb_data'),
    ],
    { stdio: 'pipe' },
  )
  await new Promise((resolve, reject) => {
    upsert.on('exit', (code) => (code === 0 ? resolve() : reject(new Error('superuser upsert ' + code))))
  })

  proc = spawn(
    bin,
    [
      'serve',
      `--http=127.0.0.1:${port}`,
      '--dir',
      join(pbDir, 'pb_data'),
      '--migrationsDir',
      join(BACKEND, 'pb_migrations'),
      '--hooksDir',
      join(BACKEND, 'pb_hooks'),
    ],
    { stdio: ['ignore', 'pipe', 'pipe'] },
  )
  let logs = ''
  proc.stdout.on('data', (d) => {
    logs += d
  })
  proc.stderr.on('data', (d) => {
    logs += d
  })
  try {
    await waitHealth(base)
  } catch (err) {
    throw new Error(String(err) + '\n' + logs)
  }

  const created = await json('POST', '/api/collections/users/records', {
    email: EMAIL,
    password: PASSWORD,
    passwordConfirm: PASSWORD,
  })
  assert.equal(created.res.status, 200, JSON.stringify(created.body))

  const auth = await json('POST', '/api/collections/users/auth-with-password', {
    identity: EMAIL,
    password: PASSWORD,
  })
  assert.equal(auth.res.status, 200, JSON.stringify(auth.body))
  token = auth.body.token
  const userId = auth.body.record.id

  const plot = await json(
    'POST',
    '/api/collections/plots/records',
    { owner: userId, name: 'Тест', width: 20, height: 15 },
    token,
  )
  assert.equal(plot.res.status, 200, JSON.stringify(plot.body))

  const plant = await json(
    'POST',
    '/api/collections/plants/records',
    { owner: userId, name: 'Пион' },
    token,
  )
  assert.equal(plant.res.status, 200, JSON.stringify(plant.body))

  const planting = await json(
    'POST',
    '/api/collections/plantings/records',
    { plot: plot.body.id, plant: plant.body.id, x: 1, y: 1, status: 'growing' },
    token,
  )
  assert.equal(planting.res.status, 200, JSON.stringify(planting.body))
  plantingId = planting.body.id
})

after(async () => {
  if (proc) proc.kill('SIGTERM')
  if (pbDir) await rm(pbDir, { recursive: true, force: true })
})

function entryPayload(etype, extra = {}) {
  return {
    planting: plantingId,
    etype,
    happened_on: '2026-09-03',
    note: extra.note || '',
    ...extra,
  }
}

describe('API entries: вырезанные типы', () => {
  it('хук и каталог не разъехались', () => {
    assert.deepEqual(policy.BLOCKED_ETYPES, [
      'water',
      'bloom',
      'harvest',
      'feed',
      'shelter',
      'note',
    ])
    assert.deepEqual(policy.ALLOWED_ETYPES, ['prune', 'replant', 'death', 'disease'])
  })

  for (const etype of policy.BLOCKED_ETYPES) {
    it(`create ${etype} → 400 на etype`, async () => {
      const { res, body } = await json('POST', '/api/collections/entries/records', entryPayload(etype), token)
      assert.equal(res.status, 400, JSON.stringify(body))
      assert.ok(body.data?.etype, JSON.stringify(body))
    })
  }

  it('create prune проходит', async () => {
    const { res, body } = await json('POST', '/api/collections/entries/records', entryPayload('prune'), token)
    assert.equal(res.status, 200, JSON.stringify(body))
    pruneId = body.id
  })

  it('create replant и death проходят', async () => {
    for (const etype of ['replant', 'death']) {
      const { res, body } = await json('POST', '/api/collections/entries/records', entryPayload(etype), token)
      assert.equal(res.status, 200, JSON.stringify(body))
    }
  })

  it('create disease без фото → 400 на photos', async () => {
    const { res, body } = await json(
      'POST',
      '/api/collections/entries/records',
      entryPayload('disease'),
      token,
    )
    assert.equal(res.status, 400, JSON.stringify(body))
    assert.ok(body.data?.photos, JSON.stringify(body))
  })

  it('create disease с фото проходит', async () => {
    const fd = new FormData()
    fd.set('planting', plantingId)
    fd.set('etype', 'disease')
    fd.set('happened_on', '2026-09-03')
    fd.set('photos', new Blob([PIXEL_PNG], { type: 'image/png' }), 'leaf.png')
    const { res, body } = await api(
      '/api/collections/entries/records',
      { method: 'POST', body: fd },
      token,
    )
    assert.equal(res.status, 200, JSON.stringify(body))
    assert.equal(body.etype, 'disease')
    assert.ok(body.photos?.length >= 1)
  })

  it('update на water → 400 на etype', async () => {
    assert.ok(pruneId)
    const { res, body } = await json(
      'PATCH',
      `/api/collections/entries/records/${pruneId}`,
      { etype: 'water' },
      token,
    )
    assert.equal(res.status, 400, JSON.stringify(body))
    assert.ok(body.data?.etype, JSON.stringify(body))
  })

  it('update разрешённой записи без смены типа проходит', async () => {
    const { res, body } = await json(
      'PATCH',
      `/api/collections/entries/records/${pruneId}`,
      { note: 'подрезали крону' },
      token,
    )
    assert.equal(res.status, 200, JSON.stringify(body))
    assert.equal(body.etype, 'prune')
    assert.equal(body.note, 'подрезали крону')
  })
})
