import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { buildYearBuckets, TimelineScrubber } from './TimelineScrubber';

describe('buildYearBuckets', () => {
  it('группирует по году и считает', () => {
    const buckets = buildYearBuckets([
      { plantedAt: '2024-05-01' },
      { plantedAt: '2024-07-01' },
      { plantedAt: '2026-03-01' },
    ]);
    expect(buckets).toEqual([
      { year: 2024, count: 2 },
      { year: 2026, count: 1 },
    ]);
  });

  it('сортирует по возрастанию года', () => {
    const buckets = buildYearBuckets([
      { plantedAt: '2026-01-01' },
      { plantedAt: '2020-01-01' },
      { plantedAt: '2023-01-01' },
    ]);
    expect(buckets.map((b) => b.year)).toEqual([2020, 2023, 2026]);
  });

  it('пустой вход → пусто', () => {
    expect(buildYearBuckets([])).toEqual([]);
  });

  it('принимает timestamp', () => {
    const ts = new Date(2025, 0, 1).getTime();
    expect(buildYearBuckets([{ plantedAt: ts }])).toEqual([{ year: 2025, count: 1 }]);
  });
});

describe('TimelineScrubber', () => {
  const buckets = [
    { year: 2024, count: 2 },
    { year: 2025, count: 1 },
  ];

  it('тап по году вызывает onSelect', () => {
    const onSelect = vi.fn();
    render(<TimelineScrubber buckets={buckets} selected="all" onSelect={onSelect} />);
    fireEvent.click(screen.getByLabelText('2024 год, посадок: 2'));
    expect(onSelect).toHaveBeenCalledWith(2024);
  });

  it('«Все» сбрасывает фильтр', () => {
    const onSelect = vi.fn();
    render(<TimelineScrubber buckets={buckets} selected={2024} onSelect={onSelect} />);
    fireEvent.click(screen.getByText('Все'));
    expect(onSelect).toHaveBeenCalledWith('all');
  });

  it('выбранный год помечен aria-pressed', () => {
    render(<TimelineScrubber buckets={buckets} selected={2025} onSelect={() => {}} />);
    expect(screen.getByLabelText('2025 год, посадок: 1')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByLabelText('2024 год, посадок: 2')).toHaveAttribute('aria-pressed', 'false');
  });
});
