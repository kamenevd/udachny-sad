import { PLANT_TYPES } from './catalog'
import type { Plant, PlantType } from './types'

/**
 * «Растение с фото заполняется само»: сервер смотрит на снимок
 * и возвращает догадку — название, вид, иногда сорт.
 * Ключ распознавания живёт только на сервере (/api/vision/plant).
 */

export interface PlantGuess {
  name: string
  cultivar: string
  ptype: PlantType
}

/** Ответ модели → поля растения. null — «не узнали». */
export function parsePlantGuess(raw: unknown): PlantGuess | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as { known?: unknown; name?: unknown; cultivar?: unknown; ptype?: unknown }
  if (r.known === false) return null
  const name = typeof r.name === 'string' ? r.name.trim().slice(0, 160) : ''
  if (!name) return null
  const cultivar = typeof r.cultivar === 'string' ? r.cultivar.trim().slice(0, 160) : ''
  const ptype =
    typeof r.ptype === 'string' && r.ptype in PLANT_TYPES ? (r.ptype as PlantType) : 'perennial'
  return { name, cultivar, ptype }
}

function norm(s: string): string {
  return s
    .toLowerCase()
    .replaceAll('ё', 'е')
    .replace(/[«»"'`]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Название целиком входит в другое как слова: «гортензия» ⊂ «гортензия метельчатая». */
function containsWords(long: string, short: string): boolean {
  return ` ${long} `.includes(` ${short} `)
}

/**
 * Ищем «такое уже есть» по имени: точное совпадение, затем совпадение
 * по словам («Гортензия» ↔ «Гортензия метельчатая»), затем общий род
 * по первому слову («Роза плетистая» ↔ «Роза»).
 */
export function matchByName<T>(items: T[], nameOf: (item: T) => string, guessName: string): T | null {
  const g = norm(guessName)
  if (!g) return null

  for (const item of items) {
    if (norm(nameOf(item)) === g) return item
  }

  for (const item of items) {
    const n = norm(nameOf(item))
    if (n && (containsWords(n, g) || containsWords(g, n))) return item
  }

  const genus = g.split(' ')[0]
  for (const item of items) {
    const n = norm(nameOf(item))
    if (n && n.split(' ')[0] === genus) return item
  }
  return null
}

/** Похожее растение уже в семейном списке? Не плодим дубли. */
export function matchPlant(plants: Plant[], guessName: string): Plant | null {
  return matchByName(plants, (p) => p.name, guessName)
}

export interface GuessApplication {
  /** Существующее растение из списка — сажаем его, а не дубль. */
  picked: Plant | null
  name: string
  ptype: PlantType
}

/** Что подставить в лист посадки: существующее растение или поля для нового. */
export function applyGuess(plants: Plant[], guess: PlantGuess): GuessApplication {
  const picked = matchPlant(plants, guess.name)
  if (picked) {
    return { picked, name: picked.name, ptype: (picked.ptype || guess.ptype) as PlantType }
  }
  return { picked: null, name: guess.name, ptype: guess.ptype }
}

/** Спрашиваем сервер, что на снимке. Любая ошибка → null, посадку не блокируем. */
export async function fetchPlantGuess(
  imageDataUrl: string,
  token: string,
  fetchFn: typeof fetch = fetch,
): Promise<PlantGuess | null> {
  try {
    const res = await fetchFn('/api/vision/plant', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: token },
      body: JSON.stringify({ image: imageDataUrl }),
      signal: AbortSignal.timeout(60000),
    })
    if (!res.ok) return null
    const data = (await res.json()) as { ok?: boolean; plant?: unknown }
    if (!data?.ok) return null
    return parsePlantGuess(data.plant)
  } catch {
    return null
  }
}

/** Уменьшаем снимок до разумного размера — быстрее едет и хватает модели. */
async function shrinkPhoto(file: File, maxSide = 1024): Promise<string> {
  const url = URL.createObjectURL(file)
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const im = new Image()
      im.onload = () => resolve(im)
      im.onerror = () => reject(new Error('bad image'))
      im.src = url
    })
    const k = Math.min(1, maxSide / Math.max(img.width, img.height))
    const w = Math.max(1, Math.round(img.width * k))
    const h = Math.max(1, Math.round(img.height * k))
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('no canvas')
    ctx.drawImage(img, 0, 0, w, h)
    return canvas.toDataURL('image/jpeg', 0.8)
  } finally {
    URL.revokeObjectURL(url)
  }
}

/** Полный путь «фото → догадка» для листов. Не бросает, максимум вернёт null. */
export async function recognizePlant(photo: File, token: string): Promise<PlantGuess | null> {
  try {
    const image = await shrinkPhoto(photo)
    return await fetchPlantGuess(image, token)
  } catch {
    return null
  }
}
