/**
 * Smoke-тест — базовая проверка окружения Vitest (задача 13.1)
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Button } from '../components/Button';

describe('Vitest environment', () => {
  it('умеет рендерить React-компоненты', () => {
    render(<Button>Тест</Button>);
    expect(screen.getByText('Тест')).toBeInTheDocument();
  });

  it('поддерживает базовые ассерты', () => {
    expect(2 + 2).toBe(4);
    expect('уДачный сад').toContain('сад');
  });
});
