/**
 * PLAN13 этап 4 — отчёт по саду для печати/PDF (ExportReport).
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type Konva from 'konva';
import { ExportReport, bloomRangeLabel } from '../components/canvas/ExportReport';
import type { PlantingWithPlant } from '../lib/pbPlantings';

describe('bloomRangeLabel', () => {
  it('диапазон из нескольких месяцев', () => {
    expect(bloomRangeLabel([6, 7, 8])).toBe('июн–авг');
  });

  it('один месяц без тире', () => {
    expect(bloomRangeLabel([5])).toBe('май');
  });

  it('сортирует и убирает дубли', () => {
    expect(bloomRangeLabel([9, 6, 6])).toBe('июн–сен');
  });

  it('пусто/мусор → прочерк', () => {
    expect(bloomRangeLabel(undefined)).toBe('—');
    expect(bloomRangeLabel([])).toBe('—');
    expect(bloomRangeLabel([0, 13] as number[])).toBe('—');
  });
});

function makeStageRef() {
  return {
    current: {
      toDataURL: vi.fn(() => 'data:image/png;base64,AAAA'),
    } as unknown as Konva.Stage,
  };
}

function planting(over: Partial<PlantingWithPlant> = {}): PlantingWithPlant {
  return {
    id: 'p1',
    gardenId: 'g1',
    plantId: 'pl1',
    plantedAt: '2026-05-01 00:00:00.000Z',
    status: 'active',
    collectionId: 'plantings',
    collectionName: 'plantings',
    plant: {
      id: 'pl1',
      userId: 'u1',
      name: 'Флокс',
      variety: 'Метельчатый',
      plantType: 'perennial',
      bloom_months: [7, 8],
      sun_exposure: 'full_sun',
      moisture: 'medium',
      collectionId: 'plants',
      collectionName: 'plants',
    },
    ...over,
  } as PlantingWithPlant;
}

describe('ExportReport', () => {
  it('до клика оверлея нет; клик делает снимок и открывает отчёт', () => {
    const stageRef = makeStageRef();
    render(
      <ExportReport
        stageRef={stageRef}
        gardenName="Дача"
        items={[{ number: 1, name: 'Клумба' }]}
        plantings={[planting()]}
      />,
    );

    expect(screen.queryByRole('dialog')).toBeNull();
    fireEvent.click(screen.getByLabelText('Сохранить план в PDF'));

    expect(stageRef.current.toDataURL).toHaveBeenCalledOnce();
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(screen.getByText('Дача')).toBeTruthy();
    expect(screen.getByText('Клумба')).toBeTruthy();
    expect(screen.getByText(/Флокс/)).toBeTruthy();
    expect(screen.getByText('июл–авг')).toBeTruthy();
  });

  it('«Закрыть» убирает отчёт', () => {
    render(
      <ExportReport
        stageRef={makeStageRef()}
        gardenName="Дача"
        items={[]}
        plantings={[]}
      />,
    );
    fireEvent.click(screen.getByLabelText('Сохранить план в PDF'));
    fireEvent.click(screen.getByText('Закрыть'));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('пустой сад — отчёт честно говорит, что посадок нет', () => {
    render(
      <ExportReport
        stageRef={makeStageRef()}
        gardenName="Дача"
        items={[]}
        plantings={[]}
      />,
    );
    fireEvent.click(screen.getByLabelText('Сохранить план в PDF'));
    expect(screen.getByText('Активных посадок пока нет')).toBeTruthy();
  });
});
