/**
 * Серверное распознавание фото. Ключ OpenRouter живёт только здесь
 * (EnvironmentFile у systemd-юнита), во фронтенд и в git он не попадает.
 *
 * POST /api/vision/startup-schema
 *   Заголовок Authorization — токен пользователя PocketBase.
 *   Тело: { plot, width, height, photos: [{ record, point, label, stand:{x,y}, facing:{x,y} }] }
 *   Фото уже загружены в коллекцию plot_photos; сервер сам берёт их
 *   уменьшенные копии у локального PocketBase и шлёт модели одним запросом.
 *   Ответ: { ok: true, vision: {...} } либо { ok: false, error }.
 *
 * POST /api/vision/plant
 *   Заголовок Authorization — токен пользователя PocketBase.
 *   Тело: { image: "data:image/jpeg;base64,..." } — уменьшенный снимок растения.
 *   Ответ: { ok: true, plant: { known, name, cultivar, ptype } } либо { ok: false, error }.
 */

const PB_URL = (process.env.UDACHA_PB_URL ?? 'http://127.0.0.1:8090').replace(/\/$/, '')
const OR_KEY = process.env.OPENROUTER_API_KEY ?? ''
const OR_BASE = (process.env.OPENROUTER_BASE ?? 'https://openrouter.ai/api/v1').replace(/\/$/, '')
// По умолчанию — модель, доступная ключу этого хоста (gpt-4o закрыт политикой данных аккаунта).
const OR_MODEL = process.env.OPENROUTER_VISION_MODEL ?? 'xiaomi/mimo-v2.5'

const ID_RE = /^[a-zA-Z0-9_-]{1,40}$/
const MAX_PHOTOS = 10
const MAX_BODY = 64 * 1024
// Фото растения приезжает в теле запроса (уменьшенный JPEG в base64).
const MAX_PLANT_BODY = 4 * 1024 * 1024

export const VISION_PATH = '/api/vision/startup-schema'
export const PLANT_VISION_PATH = '/api/vision/plant'

function json(res, status, body) {
  const data = JSON.stringify(body)
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(data),
    'Cache-Control': 'no-store',
  })
  res.end(data)
}

function readBody(req, limit = MAX_BODY) {
  return new Promise((resolve, reject) => {
    const chunks = []
    let size = 0
    req.on('data', (c) => {
      size += c.length
      if (size > limit) {
        reject(new Error('body too large'))
        req.destroy()
        return
      }
      chunks.push(c)
    })
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })
}

function num(v, min, max) {
  const n = Number(v)
  if (!Number.isFinite(n) || n < min || n > max) return null
  return n
}

function parseRequest(raw) {
  let body
  try {
    body = JSON.parse(raw)
  } catch {
    return null
  }
  if (!body || typeof body !== 'object') return null
  const plot = typeof body.plot === 'string' && ID_RE.test(body.plot) ? body.plot : null
  const width = num(body.width, 2, 1000)
  const height = num(body.height, 2, 1000)
  if (!plot || width === null || height === null || !Array.isArray(body.photos)) return null

  const photos = []
  for (const p of body.photos.slice(0, MAX_PHOTOS)) {
    if (!p || typeof p !== 'object') return null
    if (typeof p.record !== 'string' || !ID_RE.test(p.record)) return null
    const sx = num(p.stand?.x, 0, 1)
    const sy = num(p.stand?.y, 0, 1)
    const fx = num(p.facing?.x, -1, 1)
    const fy = num(p.facing?.y, -1, 1)
    if (sx === null || sy === null || fx === null || fy === null) return null
    photos.push({
      record: p.record,
      point: String(p.point ?? '').slice(0, 40),
      label: String(p.label ?? '').slice(0, 120),
      stand: { x: sx, y: sy },
      facing: { x: fx, y: fy },
    })
  }
  if (photos.length === 0) return null
  return { plot, width, height, photos }
}

async function pbFetch(path, token) {
  return fetch(PB_URL + path, {
    headers: token ? { Authorization: token } : {},
    signal: AbortSignal.timeout(15000),
  })
}

/** Проверяем доступ пользователя к участку его же токеном (правила PB). */
async function checkPlotAccess(plotId, token) {
  const res = await pbFetch(`/api/collections/plots/records/${plotId}`, token)
  return res.ok
}

/** Тянем уменьшенную копию фото из PocketBase, отдаём data-URL. */
async function loadPhoto(photo, plotId, token) {
  const recRes = await pbFetch(`/api/collections/plot_photos/records/${photo.record}`, token)
  if (!recRes.ok) return null
  const rec = await recRes.json()
  if (rec.plot !== plotId || typeof rec.photo !== 'string' || !rec.photo) return null
  const fileRes = await pbFetch(
    `/api/files/${rec.collectionId}/${rec.id}/${encodeURIComponent(rec.photo)}?thumb=800x0`,
    token,
  )
  if (!fileRes.ok) return null
  const type = fileRes.headers.get('content-type') ?? 'image/jpeg'
  const buf = Buffer.from(await fileRes.arrayBuffer())
  if (buf.length === 0 || buf.length > 4 * 1024 * 1024) return null
  return `data:${type};base64,${buf.toString('base64')}`
}

const SYSTEM_PROMPT = `You map a private garden plot from walk-around photos.
The plot is a rectangle, W meters wide and H meters deep. Coordinates are fractions 0..1:
x grows to the right, y grows toward the street side (bottom). The entrance gate is at the bottom edge.
For every photo you are told where the photographer stood (fractions of the plot) and the facing direction (unit vector, same axes).
Combine all photos into one consistent plan. Reply with ONLY a JSON object, no prose:
{
  "outline": [[x,y],...] | null,        // plot boundary polygon (3+ points) if visibly not a plain rectangle, else null
  "house": {"cx":..,"cy":..,"w":..,"h":..,"angle":0} | null,  // main house center, size, rotation degrees clockwise
  "buildings": [{"cx":..,"cy":..,"w":..,"h":..}],             // sheds, garages, greenhouses
  "paths": [{"points":[[x,y],...],"width":0.03}],             // walkways as polylines
  "beds": [{"cx":..,"cy":..,"rx":..,"ry":..}],                // flower/garden beds as ellipses
  "trees": [{"cx":..,"cy":..,"r":0.04}],                      // individual trees
  "water": [{"cx":..,"cy":..,"rx":..,"ry":..}]                // ponds, pools
}
All coordinates and sizes are fractions 0..1 of plot width (x, w, rx) or depth (y, h, ry); tree r and path width are fractions of the shorter side.
Only include objects the photos actually support. Empty arrays are fine. Do not invent decoration.`

function userPrompt(reqData) {
  const lines = [
    `Plot: ${reqData.width} x ${reqData.height} meters (width x depth).`,
    'Photos, in walk order:',
  ]
  reqData.photos.forEach((p, i) => {
    lines.push(
      `Photo ${i + 1}: stand-point "${p.label || p.point}" at (${p.stand.x.toFixed(2)}, ${p.stand.y.toFixed(2)}), facing (${p.facing.x.toFixed(2)}, ${p.facing.y.toFixed(2)}).`,
    )
  })
  lines.push('Build the plan JSON.')
  return lines.join('\n')
}

function extractJson(text) {
  if (typeof text !== 'string') return null
  const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '')
  try {
    return JSON.parse(cleaned)
  } catch {
    const start = cleaned.indexOf('{')
    const end = cleaned.lastIndexOf('}')
    if (start === -1 || end <= start) return null
    try {
      return JSON.parse(cleaned.slice(start, end + 1))
    } catch {
      return null
    }
  }
}

/** Один вызов модели с картинками, ответ — распарсенный JSON или null. */
async function callModel(system, content, { maxTokens = 2000, timeoutMs = 90000 } = {}) {
  const res = await fetch(`${OR_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OR_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://udacha.kdnfx.space',
      'X-Title': 'uDachny Sad',
    },
    body: JSON.stringify({
      model: OR_MODEL,
      temperature: 0.2,
      max_tokens: maxTokens,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: system },
        { role: 'user', content },
      ],
    }),
    signal: AbortSignal.timeout(timeoutMs),
  })
  if (!res.ok) {
    const errText = await res.text().catch(() => '')
    throw new Error(`openrouter ${res.status}: ${errText.slice(0, 200)}`)
  }
  const data = await res.json()
  return extractJson(data?.choices?.[0]?.message?.content)
}

async function askVision(reqData, images) {
  const content = [{ type: 'text', text: userPrompt(reqData) }]
  for (const url of images) {
    content.push({ type: 'image_url', image_url: { url } })
  }
  return callModel(SYSTEM_PROMPT, content)
}

export async function handleVision(req, res) {
  if (req.method !== 'POST') return json(res, 405, { ok: false, error: 'method' })
  const token = req.headers.authorization ?? ''
  if (!token) return json(res, 401, { ok: false, error: 'auth' })

  let raw
  try {
    raw = await readBody(req)
  } catch {
    return json(res, 413, { ok: false, error: 'too-large' })
  }
  const reqData = parseRequest(raw)
  if (!reqData) return json(res, 400, { ok: false, error: 'bad-request' })

  if (!(await checkPlotAccess(reqData.plot, token).catch(() => false))) {
    return json(res, 403, { ok: false, error: 'forbidden' })
  }

  if (!OR_KEY) return json(res, 503, { ok: false, error: 'vision-unavailable' })

  const images = []
  const used = []
  for (const photo of reqData.photos) {
    const url = await loadPhoto(photo, reqData.plot, token).catch(() => null)
    if (url) {
      images.push(url)
      used.push(photo)
    }
  }
  if (images.length === 0) return json(res, 502, { ok: false, error: 'no-photos' })

  const started = Date.now()
  try {
    const vision = await askVision({ ...reqData, photos: used }, images)
    if (!vision) throw new Error('empty model answer')
    console.log(`vision: plot ${reqData.plot}, ${images.length} photos, ok in ${((Date.now() - started) / 1000).toFixed(1)}s`)
    return json(res, 200, { ok: true, vision })
  } catch (e) {
    console.error(`vision: plot ${reqData.plot} failed: ${e?.message ?? e}`)
    return json(res, 502, { ok: false, error: 'vision-failed' })
  }
}

/** Токен настоящий? Спрашиваем у локального PocketBase, не разбирая JWT сами. */
async function checkUserToken(token) {
  try {
    const res = await fetch(`${PB_URL}/api/collections/users/auth-refresh`, {
      method: 'POST',
      headers: { Authorization: token },
      signal: AbortSignal.timeout(15000),
    })
    return res.ok
  } catch {
    return false
  }
}

const PLANT_PROMPT = `You identify one garden plant from one photo for a Russian home-garden app.
Reply with ONLY a JSON object, no prose:
{
  "known": true,      // false if no plant is clearly visible or you cannot tell what it is
  "name": "Гортензия метельчатая",  // household Russian name, capitalized; genus alone is fine ("Роза", "Хоста")
  "cultivar": "",     // cultivar only if clearly identifiable from the photo, else ""
  "ptype": "shrub"    // one of: perennial, shrub, tree, conifer, bulb, annual, vine, grass
}
Rules: the name must be in Russian, the way gardeners say it, no Latin.
Never invent a cultivar. If several plants are in the photo, pick the main one in the middle.
If unsure of the exact species, give the genus and set "known": true anyway.`

const DATA_URL_RE = /^data:image\/(jpeg|jpg|png|webp);base64,[A-Za-z0-9+/=]+$/

export async function handlePlantVision(req, res) {
  if (req.method !== 'POST') return json(res, 405, { ok: false, error: 'method' })
  const token = req.headers.authorization ?? ''
  if (!token) return json(res, 401, { ok: false, error: 'auth' })

  let raw
  try {
    raw = await readBody(req, MAX_PLANT_BODY)
  } catch {
    return json(res, 413, { ok: false, error: 'too-large' })
  }
  let image = ''
  try {
    const body = JSON.parse(raw)
    if (typeof body?.image === 'string') image = body.image
  } catch {
    /* невалидный JSON отсечём ниже */
  }
  if (!DATA_URL_RE.test(image)) return json(res, 400, { ok: false, error: 'bad-request' })

  if (!(await checkUserToken(token))) return json(res, 403, { ok: false, error: 'forbidden' })
  if (!OR_KEY) return json(res, 503, { ok: false, error: 'vision-unavailable' })

  const started = Date.now()
  try {
    const plant = await callModel(
      PLANT_PROMPT,
      [
        { type: 'text', text: 'What plant is on this photo?' },
        { type: 'image_url', image_url: { url: image } },
      ],
      { maxTokens: 300, timeoutMs: 45000 },
    )
    if (!plant || typeof plant !== 'object') throw new Error('empty model answer')
    console.log(
      `vision-plant: "${String(plant.name ?? '').slice(0, 60)}" in ${((Date.now() - started) / 1000).toFixed(1)}s`,
    )
    return json(res, 200, { ok: true, plant })
  } catch (e) {
    console.error(`vision-plant failed: ${e?.message ?? e}`)
    return json(res, 502, { ok: false, error: 'vision-failed' })
  }
}
