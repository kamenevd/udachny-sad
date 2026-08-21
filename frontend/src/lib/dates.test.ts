import { describe, expect, it } from 'vitest'
import {
  fmtDate,
  fmtDateShort,
  fmtMonthYear,
  groupBy,
  parseDate,
  plural,
  toInputDate,
  todayISO,
  yearOf,
} from './dates'

describe('parseDate', () => {
  it('понимает формат PocketBase с пробелом', () => {
    expect(parseDate('2026-05-12 00:00:00.000Z')?.getUTCFullYear()).toBe(2026)
  })
  it('пустая строка и мусор -> null', () => {
    expect(parseDate('')).toBeNull()
    expect(parseDate('не дата')).toBeNull()
  })
})

describe('форматирование', () => {
  it('fmtDate / fmtDateShort / fmtMonthYear по-русски', () => {
    expect(fmtDate('2026-05-12')).toBe('12 мая 2026')
    expect(fmtDateShort('2026-01-03')).toBe('3 января')
    expect(fmtMonthYear('2026-08-21')).toBe('Август 2026')
  })
  it('пустая дата -> пустая строка', () => {
    expect(fmtDate('')).toBe('')
  })
  it('yearOf', () => {
    expect(yearOf('2024-11-02 10:00:00.000Z')).toBe(2024)
  })
})

describe('todayISO / toInputDate', () => {
  it('todayISO в формате YYYY-MM-DD', () => {
    expect(todayISO()).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
  it('toInputDate обрезает время PB', () => {
    expect(toInputDate('2026-05-12 00:00:00.000Z')).toBe('2026-05-12')
    expect(toInputDate('')).toBe('')
  })
})

describe('plural', () => {
  const forms: [string, string, string] = ['год', 'года', 'лет']
  it('1 год, 2 года, 5 лет, 11 лет, 21 год, 104 года', () => {
    expect(plural(1, forms)).toBe('год')
    expect(plural(2, forms)).toBe('года')
    expect(plural(5, forms)).toBe('лет')
    expect(plural(11, forms)).toBe('лет')
    expect(plural(21, forms)).toBe('год')
    expect(plural(104, forms)).toBe('года')
  })
})

describe('groupBy', () => {
  it('группирует с сохранением порядка первого вхождения', () => {
    const out = groupBy([1, 2, 3, 4, 5], (n) => (n % 2 === 0 ? 'чёт' : 'нечет'))
    expect(out).toEqual([
      ['нечет', [1, 3, 5]],
      ['чёт', [2, 4]],
    ])
  })
})
