import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { WateringBanner } from './WateringBanner';

describe('WateringBanner', () => {
  it('ничего не рендерит, когда show=false', () => {
    const { container } = render(<WateringBanner show={false} days={10} plantName="Роза" />);
    expect(container.firstChild).toBeNull();
  });

  it('персонализирует названием растения и склоняет дни', () => {
    render(<WateringBanner show days={8} plantName="Флоксы" />);
    expect(screen.getByText(/Флоксы не поливали 8 дней/)).toBeInTheDocument();
  });

  it('склонение для 1 дня', () => {
    render(<WateringBanner show days={21} plantName="Пион" />);
    expect(screen.getByText(/21 день/)).toBeInTheDocument();
  });

  it('фоллбэк-текст без названия', () => {
    render(<WateringBanner show days={9} />);
    expect(screen.getByText(/Посадку не поливали 9 дней/)).toBeInTheDocument();
  });
});
