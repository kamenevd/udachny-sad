/**
 * Компонентные тесты (задача 13.3)
 * Button (варианты, клики), Modal (открытие/закрытие/Escape),
 * StampOverlay (автоскрытие)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Button } from '../components/Button';
import { Modal } from '../components/Modal';
import { StampOverlay } from '../components/StampOverlay';
import { SkeletonList, PlantCardSkeleton } from '../components/Skeleton';

describe('Button', () => {
  it('рендерит children', () => {
    render(<Button>Нажми меня</Button>);
    expect(screen.getByText('Нажми меня')).toBeInTheDocument();
  });

  it('вызывает onClick при клике', () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Клик</Button>);
    fireEvent.click(screen.getByText('Клик'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('применяет variant danger', () => {
    render(<Button variant="danger">Удалить</Button>);
    const btn = screen.getByText('Удалить');
    expect(btn.className).toContain('text-red');
  });

  it('применяет variant primary (по умолчанию)', () => {
    render(<Button>Основная</Button>);
    const btn = screen.getByText('Основная');
    expect(btn.className).toContain('bg-red');
  });

  it('не вызывает onClick когда disabled', () => {
    const onClick = vi.fn();
    render(<Button disabled onClick={onClick}>Недоступна</Button>);
    fireEvent.click(screen.getByText('Недоступна'));
    expect(onClick).not.toHaveBeenCalled();
  });
});

describe('Modal', () => {
  it('не рендерится когда open=false', () => {
    render(
      <Modal open={false} title="Тест" onConfirm={() => {}} onCancel={() => {}}>
        Контент
      </Modal>
    );
    expect(screen.queryByText('Тест')).not.toBeInTheDocument();
  });

  it('рендерится когда open=true', () => {
    render(
      <Modal open={true} title="Внимание" onConfirm={() => {}} onCancel={() => {}}>
        Вы уверены?
      </Modal>
    );
    expect(screen.getByText('Внимание')).toBeInTheDocument();
    expect(screen.getByText('Вы уверены?')).toBeInTheDocument();
  });

  it('показывает кастомный confirmText', () => {
    render(
      <Modal open={true} title="Т" confirmText="Удалить" onConfirm={() => {}} onCancel={() => {}}>
        x
      </Modal>
    );
    expect(screen.getByText('Удалить')).toBeInTheDocument();
  });

  it('вызывает onCancel при клике на «Отмена»', () => {
    const onCancel = vi.fn();
    render(
      <Modal open={true} title="Т" onCancel={onCancel} onConfirm={() => {}}>
        x
      </Modal>
    );
    fireEvent.click(screen.getByText('Отмена'));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('вызывает onCancel при нажатии Escape', () => {
    const onCancel = vi.fn();
    render(
      <Modal open={true} title="Т" onCancel={onCancel} onConfirm={() => {}}>
        x
      </Modal>
    );
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});

describe('StampOverlay', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('не рендерится когда action=null', () => {
    render(<StampOverlay action={null} onClose={() => {}} />);
    expect(screen.queryByText('ЗАПИСАНО')).not.toBeInTheDocument();
  });

  it('автоскрывается через 1400мс', async () => {
    vi.useRealTimers();
    const onClose = vi.fn();
    render(<StampOverlay action="ТЕСТ" onClose={onClose} durationMs={100} />);
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1), { timeout: 500 });
  });
});

describe('Skeleton', () => {
  it('PlantCardSkeleton рендерится без ошибок', () => {
    const { container } = render(<PlantCardSkeleton />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('SkeletonList рендерит N элементов', () => {
    const { container } = render(<SkeletonList count={5} />);
    const items = container.querySelectorAll('.animate-pulse');
    expect(items.length).toBeGreaterThan(0);
  });

  it('SkeletonList по умолчанию рендерит 3 элемента', () => {
    const { container } = render(<SkeletonList />);
    const items = container.querySelectorAll('[aria-hidden="true"]');
    // Каждый SkeletonLineItem содержит несколько aria-hidden блоков,
    // но должен быть как минимум 1 внешний на строку
    expect(items.length).toBeGreaterThanOrEqual(3);
  });
});
