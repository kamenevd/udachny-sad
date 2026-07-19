/**
 * ResetPassword — экран «Забыли пароль?» (PLAN9 задача K.3).
 *
 * Сброс пароля через PocketBase: `requestPasswordReset(email)` отправляет
 * письмо со ссылкой сброса. Из соображений приватности не раскрываем, есть ли
 * такой email в базе — при успешном запросе всегда показываем один и тот же
 * текст «письмо отправлено».
 */
import { useState } from 'react';
import { pb } from '../lib/pb';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { SkipLink } from '../components/SkipLink';

interface ResetPasswordProps {
  /** Вернуться на экран входа. */
  onBack: () => void;
}

export function ResetPassword({ onBack }: ResetPasswordProps) {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setError('');
    setSubmitting(true);
    try {
      await pb.collection('users').requestPasswordReset(email.trim());
      setSent(true);
    } catch {
      setError('Не получилось отправить письмо. Проверьте адрес и попробуйте ещё раз.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <SkipLink />
      <main
        id="main-content"
        className="flex min-h-screen flex-col items-center justify-center px-4 py-6 bg-paper"
      >
        <div className="w-full max-w-sm flex flex-col gap-4">
          <div className="text-center">
            <div className="mb-3 text-6xl">🔑</div>
            <h1 className="text-[30px] leading-[1.1] font-poster font-semibold uppercase tracking-[0.03em] text-ink">
              Сброс пароля
            </h1>
            <p className="mt-3 text-[17px] leading-[1.55] text-ink-muted">
              {sent
                ? 'Если такой адрес есть в системе, мы отправили на него письмо со ссылкой для сброса пароля. Проверьте почту.'
                : 'Введите email — пришлём ссылку для восстановления доступа.'}
            </p>
          </div>

          {!sent && (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <Input
                label="Email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
              {error && <p className="text-[15px] font-mono text-red">{error}</p>}
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? 'Отправляем…' : 'Отправить письмо'}
              </Button>
            </form>
          )}

          <button
            type="button"
            className="text-[15px] font-mono text-blueink underline underline-offset-4"
            onClick={onBack}
          >
            ← Назад ко входу
          </button>
        </div>
      </main>
    </>
  );
}
