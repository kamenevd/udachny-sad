/**
 * Задача B.4 — вход через Telegram и Яндекс на PocketBase SDK.
 * Google полностью убран (федеральное требование) — как и email/пароль,
 * единственные способы входа: Telegram Login Widget и Яндекс OAuth2.
 *
 * ⚠️ Не проверено на живом PocketBase (нет OAuth-кредов Яндекса/Telegram
 * bot token — задачи B.1/B.2 требуют ручной регистрации, см. README) —
 * логика написана по официальной документации PocketBase SDK и Telegram
 * Login Widget, но end-to-end флоу не прогонялся.
 */
import { pb, type PbUser } from "./pb";

const TELEGRAM_WIDGET_SRC = "https://telegram.org/js/telegram-widget.js?22";
const TELEGRAM_CALLBACK_NAME = "__udachaTelegramAuthCallback";

interface TelegramAuthPayload {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
}

declare global {
  interface Window {
    [TELEGRAM_CALLBACK_NAME]?: (user: TelegramAuthPayload) => void;
  }
}

const TELEGRAM_WIDGET_TIMEOUT_MS = 5000;

export interface TelegramWidgetMount {
  /**
   * Резолвится, когда telegram-widget.js загрузился; реджектится при ошибке
   * загрузки или по таймауту 5 с (PLAN10 B.3 — telegram.org может быть
   * заблокирован, UI показывает фолбэк-сообщение).
   */
  ready: Promise<void>;
  cleanup: () => void;
}

/**
 * Монтирует Telegram Login Widget в переданный контейнер. По завершении
 * входа (пользователь подтвердил в Telegram) виджет вызывает callback с
 * подписанными данными — они уходят на pb_hooks/telegram_auth.pb.js
 * (см. эндпоинт `POST /api/telegram-auth`), тот проверяет подпись и
 * возвращает PocketBase auth-токен.
 */
export function mountTelegramLoginWidget(
  container: HTMLElement,
  botUsername: string,
  timeoutMs: number = TELEGRAM_WIDGET_TIMEOUT_MS,
): TelegramWidgetMount {
  container.innerHTML = "";

  window[TELEGRAM_CALLBACK_NAME] = (user: TelegramAuthPayload) => {
    void loginWithTelegram(user);
  };

  let settled = false;
  let resolveReady!: () => void;
  let rejectReady!: (err: Error) => void;
  const ready = new Promise<void>((resolve, reject) => {
    resolveReady = resolve;
    rejectReady = reject;
  });

  const timer = window.setTimeout(() => {
    if (settled) return;
    settled = true;
    rejectReady(
      new Error(`Telegram widget не загрузился за ${timeoutMs} мс`),
    );
  }, timeoutMs);

  const script = document.createElement("script");
  script.src = TELEGRAM_WIDGET_SRC;
  script.async = true;
  script.setAttribute("data-telegram-login", botUsername);
  script.setAttribute("data-size", "large");
  script.setAttribute("data-radius", "10");
  script.setAttribute("data-onauth", `${TELEGRAM_CALLBACK_NAME}(user)`);
  script.setAttribute("data-request-access", "write");
  script.onload = () => {
    if (settled) return;
    settled = true;
    window.clearTimeout(timer);
    resolveReady();
  };
  script.onerror = () => {
    if (settled) return;
    settled = true;
    window.clearTimeout(timer);
    rejectReady(new Error("Telegram widget не загрузился (ошибка сети)"));
  };
  container.appendChild(script);

  const cleanup = () => {
    window.clearTimeout(timer);
    // Резолвим «вхолостую», чтобы размонтирование (StrictMode, уход с экрана)
    // не оставляло unhandled rejection у подписчиков ready.
    if (!settled) {
      settled = true;
      resolveReady();
    }
    container.innerHTML = "";
    delete window[TELEGRAM_CALLBACK_NAME];
  };

  return { ready, cleanup };
}

/** Обмен подписанных данных Telegram-виджета на PocketBase auth-токен. */
async function loginWithTelegram(payload: TelegramAuthPayload): Promise<void> {
  const res = await fetch(`${pb.baseURL}/api/telegram-auth`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(`Не удалось войти через Telegram (${res.status})`);
  }

  const { token, record } = (await res.json()) as { token: string; record: PbUser };
  pb.authStore.save(token, record);
}

// ─── Яндекс OAuth2 (PLAN10 B.2) ─────────────────────────────────────────
//
// Два флоу:
//  • popup (десктоп) — стандартный authWithOAuth2 SDK: popup → Яндекс →
//    /redirect.html → postMessage обратно. На мобильных Safari/iOS popup
//    блокируется, поэтому там —
//  • redirect (мобильные) — top-окно уходит на Яндекс и возвращается на
//    /auth/yandex/callback?code=...&state=... (экран YandexCallback.tsx).
//
// ⚠️ Отступление от эскиза PLAN10: в pocketbase SDK 0.27 у authWithOAuth2()
// НЕТ опций `url`/`code` — redirect-флоу делается вручную (официальный
// «manual code exchange» из доков PB): listAuthMethods() даёт authURL,
// state и codeVerifier; их сохраняем в localStorage (переживает уход на
// Яндекс), а на callback-экране завершаем обмен через
// authWithOAuth2Code(provider, code, codeVerifier, redirectURL).

const YANDEX_PROVIDER = "yandex";
export const YANDEX_CALLBACK_PATH = "/auth/yandex/callback";
const YANDEX_REDIRECT_STORAGE_KEY = "udacha_yandex_oauth";

interface StoredYandexRedirect {
  state: string;
  codeVerifier: string;
  redirectUrl: string;
}

/** Мобильный браузер → popup почти наверняка заблокирован, нужен redirect. */
export function isMobileBrowser(): boolean {
  return (
    window.innerWidth < 768 ||
    /Mobi|Android|iPhone|iPad/.test(navigator.userAgent)
  );
}

/**
 * Вход через Яндекс: на десктопе — popup-флоу SDK, на мобильных — redirect.
 * В redirect-флоу промис «не завершается» — страница уходит на Яндекс.
 */
export async function loginWithYandex(): Promise<void> {
  if (isMobileBrowser()) {
    await loginWithYandexRedirect();
    return;
  }
  await pb.collection("users").authWithOAuth2({ provider: YANDEX_PROVIDER });
}

/** Redirect-флоу: сохраняем PKCE-параметры и уводим окно на Яндекс. */
export async function loginWithYandexRedirect(): Promise<void> {
  const methods = await pb.collection("users").listAuthMethods();
  const provider = methods.oauth2.providers.find(
    (p) => p.name === YANDEX_PROVIDER,
  );
  if (!provider) {
    throw new Error("Яндекс OAuth2 не настроен на сервере PocketBase");
  }

  const redirectUrl = window.location.origin + YANDEX_CALLBACK_PATH;
  const stored: StoredYandexRedirect = {
    state: provider.state,
    codeVerifier: provider.codeVerifier,
    redirectUrl,
  };
  localStorage.setItem(YANDEX_REDIRECT_STORAGE_KEY, JSON.stringify(stored));

  // authURL у PocketBase заканчивается на "&redirect_uri=" — дописываем свой.
  window.location.href = provider.authURL + encodeURIComponent(redirectUrl);
}

/**
 * Завершение redirect-флоу на /auth/yandex/callback: сверяем state,
 * меняем code на auth-токен. Вызывается из YandexCallback.tsx.
 */
export async function completeYandexRedirect(
  searchParams: URLSearchParams,
): Promise<void> {
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const raw = localStorage.getItem(YANDEX_REDIRECT_STORAGE_KEY);
  localStorage.removeItem(YANDEX_REDIRECT_STORAGE_KEY);

  if (!code) {
    throw new Error("Яндекс не вернул код авторизации (параметр code)");
  }
  if (!raw) {
    throw new Error(
      "Не найдены параметры начатого входа — начните вход заново",
    );
  }

  const stored = JSON.parse(raw) as StoredYandexRedirect;
  if (!state || state !== stored.state) {
    throw new Error("Параметр state не совпадает — попробуйте войти ещё раз");
  }

  await pb
    .collection("users")
    .authWithOAuth2Code(
      YANDEX_PROVIDER,
      code,
      stored.codeVerifier,
      stored.redirectUrl,
    );
}

export function logout(): void {
  pb.authStore.clear();
}

export function currentUser(): PbUser | null {
  return pb.authStore.isValid ? (pb.authStore.record as PbUser | null) : null;
}
