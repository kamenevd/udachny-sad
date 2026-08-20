/**
 * PLAN13 этап 5 — «Что сделать сейчас»: сезонные дела по месяцу и составу
 * справочника (lib/seasonalTasks) и карточка на главном экране.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { getSeasonalTasks } from '../lib/seasonalTasks';

const { mockPlantsList } = vi.hoisted(() => ({ mockPlantsList: vi.fn() }));
vi.mock('../lib/pb', () => ({
  plants: { list: mockPlantsList },
}));

import { SeasonalTasksCard } from '../components/SeasonalTasksCard';

function plant(plantType: string) {
  return { plantType };
}

describe('getSeasonalTasks', () => {
  it('пустой справочник — никаких советов', () => {
    expect(getSeasonalTasks(11, [])).toEqual([]);
  });

  it('ноябрь + розы = укрытие; без роз укрытие не советуем', () => {
    const withRoses = getSeasonalTasks(11, [plant('rose')]);
    expect(withRoses.map((t) => t.title)).toContain('Укройте розы');

    const withoutRoses = getSeasonalTasks(11, [plant('perennial')]);
    expect(withoutRoses.map((t) => t.title)).not.toContain('Укройте розы');
  });

  it('сентябрь + луковичные = посадка 🌱', () => {
    const tasks = getSeasonalTasks(9, [plant('bulb')]);
    expect(tasks.some((t) => t.icon === '🌱' && /луковичные/i.test(t.title))).toBe(true);
  });

  it('общесадовые задачи (без types) видны любому непустому справочнику', () => {
    const tasks = getSeasonalTasks(7, [plant('conifer')]);
    expect(tasks.map((t) => t.title)).toContain('Полив в жару — обильный и редкий');
  });

  it('каждый месяц календаря заполнен', () => {
    const everything = [
      'tree', 'shrub', 'conifer', 'rose', 'perennial', 'bulb', 'annual',
    ].map(plant);
    for (let m = 1; m <= 12; m += 1) {
      expect(getSeasonalTasks(m, everything).length).toBeGreaterThan(0);
    }
  });
});

describe('SeasonalTasksCard', () => {
  it('показывает дела месяца по составу справочника', async () => {
    mockPlantsList.mockResolvedValue([plant('rose')]);
    render(<SeasonalTasksCard now={new Date(2026, 10, 15)} />); // ноябрь
    await waitFor(() =>
      expect(screen.getByText('Укройте розы')).toBeInTheDocument(),
    );
    expect(screen.getByText(/Что сделать в ноябре/i)).toBeTruthy();
  });

  it('пустой справочник — карточки нет', async () => {
    mockPlantsList.mockResolvedValue([]);
    const { container } = render(<SeasonalTasksCard now={new Date(2026, 10, 15)} />);
    await waitFor(() => expect(mockPlantsList).toHaveBeenCalled());
    expect(container.firstChild).toBeNull();
  });

  it('ошибка загрузки не роняет главный экран', async () => {
    mockPlantsList.mockRejectedValue(new Error('offline'));
    const { container } = render(<SeasonalTasksCard />);
    await waitFor(() => expect(mockPlantsList).toHaveBeenCalled());
    expect(container.firstChild).toBeNull();
  });
});
