import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const mockRequestReset = vi.fn();

vi.mock('../lib/pb', () => ({
  pb: {
    collection: () => ({ requestPasswordReset: mockRequestReset }),
  },
}));

import { ResetPassword } from './ResetPassword';

beforeEach(() => {
  mockRequestReset.mockReset();
});

describe('ResetPassword', () => {
  it('отправляет запрос сброса и показывает подтверждение', async () => {
    mockRequestReset.mockResolvedValue(true);
    render(<ResetPassword onBack={() => {}} />);
    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'user@example.com' },
    });
    fireEvent.click(screen.getByText('Отправить письмо'));
    await waitFor(() =>
      expect(screen.getByText(/мы отправили на него письмо/)).toBeInTheDocument(),
    );
    expect(mockRequestReset).toHaveBeenCalledWith('user@example.com');
  });

  it('показывает ошибку при сбое', async () => {
    mockRequestReset.mockRejectedValue(new Error('fail'));
    render(<ResetPassword onBack={() => {}} />);
    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'user@example.com' },
    });
    fireEvent.click(screen.getByText('Отправить письмо'));
    await waitFor(() =>
      expect(screen.getByText(/Не получилось отправить письмо/)).toBeInTheDocument(),
    );
  });

  it('кнопка «Назад» вызывает onBack', () => {
    const onBack = vi.fn();
    render(<ResetPassword onBack={onBack} />);
    fireEvent.click(screen.getByText('← Назад ко входу'));
    expect(onBack).toHaveBeenCalled();
  });
});
