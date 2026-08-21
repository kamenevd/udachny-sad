/** Работа с датами: PocketBase хранит их как 'YYYY-MM-DD HH:mm:ss.SSSZ' или 'YYYY-MM-DD'. */

const MONTHS_GEN = [
  'января',
  'февраля',
  'марта',
  'апреля',
  'мая',
  'июня',
  'июля',
  'августа',
  'сентября',
  'октября',
  'ноября',
  'декабря',
]

const MONTHS_NOM = [
  'Январь',
  'Февраль',
  'Март',
  'Апрель',
  'Май',
  'Июнь',
  'Июль',
  'Август',
  'Сентябрь',
  'Октябрь',
  'Ноябрь',
  'Декабрь',
]

export function parseDate(iso: string): Date | null {
  if (!iso) return null
  const d = new Date(iso.includes('T') ? iso : iso.replace(' ', 'T'))
  return Number.isNaN(d.getTime()) ? null : d
}

/** '2026-05-12' -> '12 мая 2026' */
export function fmtDate(iso: string): string {
  const d = parseDate(iso)
  if (!d) return ''
  return `${d.getDate()} ${MONTHS_GEN[d.getMonth()]} ${d.getFullYear()}`
}

/** '2026-05-12' -> '12 мая' */
export function fmtDateShort(iso: string): string {
  const d = parseDate(iso)
  if (!d) return ''
  return `${d.getDate()} ${MONTHS_GEN[d.getMonth()]}`
}

/** '2026-05-12' -> 'Май 2026' */
export function fmtMonthYear(iso: string): string {
  const d = parseDate(iso)
  if (!d) return ''
  return `${MONTHS_NOM[d.getMonth()]} ${d.getFullYear()}`
}

export function yearOf(iso: string): number {
  const d = parseDate(iso)
  return d ? d.getFullYear() : 0
}

/** Сегодня в формате input[type=date] / PocketBase date. */
export function todayISO(): string {
  const d = new Date()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

/** Дата из PB ('2026-05-12 00:00:00.000Z') -> значение для input[type=date]. */
export function toInputDate(iso: string): string {
  if (!iso) return ''
  return iso.slice(0, 10)
}

/** Русское склонение: plural(3, ['год','года','лет']) -> 'года' */
export function plural(n: number, forms: [string, string, string]): string {
  const abs = Math.abs(n) % 100
  const last = abs % 10
  if (abs > 10 && abs < 20) return forms[2]
  if (last === 1) return forms[0]
  if (last >= 2 && last <= 4) return forms[1]
  return forms[2]
}

/** Группировка списка по ключу с сохранением порядка. */
export function groupBy<T>(items: T[], key: (item: T) => string): [string, T[]][] {
  const map = new Map<string, T[]>()
  for (const item of items) {
    const k = key(item)
    const arr = map.get(k)
    if (arr) arr.push(item)
    else map.set(k, [item])
  }
  return [...map.entries()]
}
