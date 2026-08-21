/**
 * PLAN13 этап 4 — теги-фильтры условий в каталоге растений.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  TagFilter,
  EMPTY_TAG_FILTER,
  isTagFilterEmpty,
  matchesTagFilter,
  type TagFilterState,
} from '../components/TagFilter';
import type { PlantTraits } from '../types/plant';

const sunny: PlantTraits = { sun_exposure: 'full_sun', moisture: 'low' };
const shady: PlantTraits = { sun_exposure: 'full_shade', moisture: 'high' };
const unknown: PlantTraits = {};

describe('matchesTagFilter', () => {
  it('пустой фильтр пропускает всех', () => {
    expect(matchesTagFilter(sunny, EMPTY_TAG_FILTER)).toBe(true);
    expect(matchesTagFilter(unknown, EMPTY_TAG_FILTER)).toBe(true);
    expect(isTagFilterEmpty(EMPTY_TAG_FILTER)).toBe(true);
  });

  it('внутри категории — ИЛИ', () => {
    const state: TagFilterState = { sun: ['full_sun', 'full_shade'], moisture: [] };
    expect(matchesTagFilter(sunny, state)).toBe(true);
    expect(matchesTagFilter(shady, state)).toBe(true);
  });

  it('между категориями — И', () => {
    const state: TagFilterState = { sun: ['full_sun'], moisture: ['high'] };
    expect(matchesTagFilter(sunny, state)).toBe(false); // солнце да, влага нет
    expect(matchesTagFilter(shady, state)).toBe(false); // влага да, солнце нет
    expect(
      matchesTagFilter({ sun_exposure: 'full_sun', moisture: 'high' }, state),
    ).toBe(true);
  });

  it('растение без трейта не проходит активный фильтр категории', () => {
    expect(matchesTagFilter(unknown, { sun: ['full_shade'], moisture: [] })).toBe(false);
    expect(matchesTagFilter(unknown, { sun: [], moisture: ['low'] })).toBe(false);
  });
});

describe('TagFilter (компонент)', () => {
  it('тап по чипу включает и выключает тег', () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <TagFilter state={EMPTY_TAG_FILTER} onChange={onChange} />,
    );

    fireEvent.click(screen.getByRole('button', { name: /Солнце/ }));
    expect(onChange).toHaveBeenLastCalledWith({ sun: ['full_sun'], moisture: [] });

    rerender(
      <TagFilter state={{ sun: ['full_sun'], moisture: [] }} onChange={onChange} />,
    );
    expect(
      screen.getByRole('button', { name: /Солнце/ }).getAttribute('aria-pressed'),
    ).toBe('true');

    fireEvent.click(screen.getByRole('button', { name: /Солнце/ }));
    expect(onChange).toHaveBeenLastCalledWith(EMPTY_TAG_FILTER);
  });

  it('чипы влаги независимы от чипов света', () => {
    const onChange = vi.fn();
    render(
      <TagFilter state={{ sun: ['full_sun'], moisture: [] }} onChange={onChange} />,
    );
    fireEvent.click(screen.getByRole('button', { name: /Влажно/ }));
    expect(onChange).toHaveBeenLastCalledWith({ sun: ['full_sun'], moisture: ['high'] });
  });
});
