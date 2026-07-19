import { useEffect, useState } from "react";
import { completeYandexRedirect } from "../lib/auth";
import { Button } from "../components/Button";

/**
 * PLAN10 B.2 — приёмник redirect-флоу Яндекс OAuth2.
 * Яндекс возвращает пользователя на /auth/yandex/callback?code=...&state=...;
 * здесь завершаем обмен code → auth-токен (см. completeYandexRedirect) и
 * возвращаемся на главную. Роутинг — по pathname в main.tsx.
 *
 * ⚠️ Требует, чтобы прод-nginx отдавал index.html для /auth/yandex/callback
 * (SPA-fallback try_files) — иначе будет 404 до загрузки приложения.
 */

type Status = "pending" | "error";

// Обмен code → токен одноразовый (localStorage-параметры и сам code
// сгорают при первом вызове), а StrictMode в dev вызывает эффект дважды —
// поэтому мемоизируем промис на уровне модуля.
let exchange: Promise<void> | null = null;
function completeOnce(): Promise<void> {
  exchange ??= completeYandexRedirect(
    new URLSearchParams(window.location.search),
  );
  return exchange;
}

export function YandexCallback() {
  const [status, setStatus] = useState<Status>("pending");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;
    void completeOnce().then(
      () => {
        // Успех: токен в pb.authStore. Уходим на главную полной заменой URL,
        // чтобы code/state не остались в истории браузера.
        window.location.replace("/");
      },
      (err: unknown) => {
        if (cancelled) return;
        setStatus("error");
        setMessage(
          err instanceof Error
            ? err.message
            : "Не получилось завершить вход через Яндекс",
        );
      },
    );
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-paper px-4 py-6">
      <div className="flex w-full max-w-sm flex-col items-center gap-4 text-center">
        <div className="text-6xl">🌾</div>
        {status === "pending" ? (
          <>
            <h1 className="text-[24px] leading-[1.1] font-poster font-semibold uppercase tracking-[0.03em] text-ink">
              Входим через Яндекс…
            </h1>
            <p className="text-[15px] font-mono text-ink-muted">
              Секундочку, завершаем вход
            </p>
          </>
        ) : (
          <>
            <h1 className="text-[24px] leading-[1.1] font-poster font-semibold uppercase tracking-[0.03em] text-ink">
              Не получилось войти
            </h1>
            <p role="alert" className="text-[15px] font-mono text-red">
              {message}
            </p>
            <Button
              type="button"
              className="w-full"
              onClick={() => window.location.replace("/")}
            >
              Вернуться ко входу
            </Button>
          </>
        )}
      </div>
    </main>
  );
}
