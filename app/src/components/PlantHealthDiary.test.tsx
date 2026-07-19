import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { summarizeHealth, PlantHealthDiary, type HealthPlanting } from './PlantHealthDiary';

const mockGetHealthDiary = vi.fn();
vi.mock('../lib/ai', () => ({
  getHealthDiary: (id: string) => mockGetHealthDiary(id),
}));

beforeEach(() => mockGetHealthDiary.mockReset());

describe('summarizeHealth', () => {
  it('считает смертность', () => {
    const list: HealthPlanting[] = [
      { status: 'dead', plantedAt: '2024-05-01', plant: { name: 'Петуния', plantType: 'annual' } },
      { status: 'completed', plantedAt: '2024-05-01', plant: { name: 'Лобелия', plantType: 'annual' } },
      { status: 'active', plantedAt: '2025-05-01', plant: { name: 'Сальвия', plantType: 'annual' } },
      { status: 'dead', plantedAt: '2025-05-01', plant: { name: 'Лук', plantType: 'annual' } },
    ];
    const s = summarizeHealth(list);
    expect(s.total).toBe(4);
    expect(s.dead).toBe(2);
    expect(s.mortalityPct).toBe(50);
  });

  it('находит монокультуру (тип в ≥2 годах)', () => {
    const list: HealthPlanting[] = [
      { status: 'completed', plantedAt: '2024-05-01', plant: { name: 'Петуния', plantType: 'annual' } },
      { status: 'completed', plantedAt: '2025-05-01', plant: { name: 'Лобелия', plantType: 'annual' } },
      { status: 'active', plantedAt: '2024-05-01', plant: { name: 'Туя', plantType: 'tree' } },
    ];
    const s = summarizeHealth(list);
    expect(s.monocultureTypes).toEqual(['annual']);
  });

  it('пустой вход безопасен', () => {
    expect(summarizeHealth([])).toEqual({
      total: 0,
      dead: 0,
      mortalityPct: 0,
      monocultureTypes: [],
    });
  });
});

describe('PlantHealthDiary', () => {
  const plantings: HealthPlanting[] = [
    { status: 'dead', plantedAt: '2024-05-01', plant: { name: 'Петуния', plantType: 'annual' } },
    { status: 'completed', plantedAt: '2025-05-01', plant: { name: 'Лобелия', plantType: 'annual' } },
  ];

  it('ничего не рендерит без истории', () => {
    const { container } = render(<PlantHealthDiary schemaObjectId="o1" plantings={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('показывает локальную сводку сразу', () => {
    render(<PlantHealthDiary schemaObjectId="o1" plantings={plantings} />);
    expect(screen.getByText(/Всего посадок: 2, погибло: 1 \(50%\)/)).toBeInTheDocument();
  });

  it('запрашивает AI-анализ по кнопке', async () => {
    mockGetHealthDiary.mockResolvedValue('Севооборот нарушен, чередуйте культуры');
    render(<PlantHealthDiary schemaObjectId="o1" plantings={plantings} />);
    fireEvent.click(screen.getByText('Анализ ИИ: болезни и севооборот'));
    await waitFor(() =>
      expect(screen.getByText('Севооборот нарушен, чередуйте культуры')).toBeInTheDocument(),
    );
    expect(mockGetHealthDiary).toHaveBeenCalledWith('o1');
  });
});
