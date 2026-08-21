import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

/**
 * Контракт по решениям владельца (Дима, 21.08):
 * 1) стартовая схема — только у нового участка, не в меню «+» плана;
 * 2) «Прогулка с фотоаппаратом» удалена насовсем.
 * Тесты читают исходники, чтобы фича не вернулась незаметно.
 */

const SRC = join(dirname(fileURLToPath(import.meta.url)), '..')

function read(rel: string): string {
  return readFileSync(join(SRC, rel), 'utf8')
}

function allSourceFiles(dir = SRC): string[] {
  const out: string[] = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) out.push(...allSourceFiles(full))
    else if (/\.(ts|tsx|css)$/.test(entry.name)) out.push(full)
  }
  return out
}

describe('стартовая схема — только при создании участка', () => {
  it('в листе «Добавить на план» нет пункта стартовой схемы', () => {
    const src = read('pages/PlanPage.tsx')
    const sheetStart = src.indexOf('Добавить на план')
    expect(sheetStart).toBeGreaterThan(-1)
    // Лист «Добавить» заканчивается на выборе объектов участка.
    const sheetEnd = src.indexOf('</Sheet>', sheetStart)
    const sheet = src.slice(sheetStart, sheetEnd)
    expect(sheet).not.toContain('Стартовая схема')
    expect(sheet).not.toContain('startupOpen')
  })

  it('панель стартовой схемы показывается только на пустом плане', () => {
    const src = read('pages/PlanPage.tsx')
    // Кнопка запуска прогулки по точкам живёт за проверкой «объектов ещё нет».
    const panel = src.indexOf('features.length === 0')
    expect(panel).toBeGreaterThan(-1)
    const after = src.slice(panel, panel + 600)
    expect(after).toContain('Стартовая схема с фото')
  })

  it('мастер нового участка передаёт плану «участок только что создан»', () => {
    const plots = read('pages/PlotsPage.tsx')
    expect(plots).toContain('freshPlot: true')
    const plan = read('pages/PlanPage.tsx')
    expect(plan).toContain('freshPlot')
  })
})

describe('«Прогулка с фотоаппаратом» удалена насовсем', () => {
  it('файлов photoWalk больше нет', () => {
    expect(existsSync(join(SRC, 'lib/photoWalk.ts'))).toBe(false)
    expect(existsSync(join(SRC, 'lib/photoWalk.test.ts'))).toBe(false)
  })

  it('в коде не осталось режима и следов прогулки', () => {
    for (const file of allSourceFiles()) {
      if (file.endsWith('planContract.test.ts')) continue
      // Страница «Что зреет» упоминает прогулку в разделе «Убрали» — это документ, не код.
      if (file.endsWith('RoadmapPage.tsx')) continue
      const src = readFileSync(file, 'utf8')
      expect(src, file).not.toMatch(/photo-walk|photoWalk|walkResult|PhotoWalk/)
      expect(src, file).not.toContain('Прогулка с фотоаппаратом')
    }
  })

  it('страница «Что зреет» показывает прогулку как убранную, не «уже есть»', () => {
    const src = read('pages/RoadmapPage.tsx')
    const item = src.indexOf('Прогулка с фотоаппаратом')
    expect(item).toBeGreaterThan(-1)
    const around = src.slice(Math.max(0, item - 300), item)
    expect(around).toContain("'gone'")
    expect(src).toContain('Убрали')
  })
})
