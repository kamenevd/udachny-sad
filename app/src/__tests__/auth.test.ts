/**
 * Тесты app/src/lib/auth.ts (PLAN10 C.1) — Яндекс OAuth2 (popup-флоу,
 * PocketBase SDK мокается) и DOM-логика Telegram-виджета, включая
 * таймаут/ошибку загрузки скрипта (B.3). Живой сети нет.
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { loginWithYandex, mountTelegramLoginWidget } from "../lib/auth";
import { pb } from "../lib/pb";

vi.mock("../lib/pb", () => {
  const usersCollection = {
    authWithOAuth2: vi.fn().mockResolvedValue({}),
    authWithOAuth2Code: vi.fn().mockResolvedValue({}),
    listAuthMethods: vi.fn(),
  };
  return {
    pb: {
      baseURL: "http://pb.test",
      collection: vi.fn(() => usersCollection),
      authStore: { save: vi.fn(), clear: vi.fn(), isValid: false, record: null },
    },
  };
});

afterEach(() => {
  vi.clearAllMocks();
  vi.useRealTimers();
  document.body.innerHTML = "";
});

describe("loginWithYandex", () => {
  // PLAN10 fix: popup-флоу отключён (Яндекс-приложение знает только
  // redirect URI udacha.kdnfx.space/auth/yandex/callback), поэтому и на
  // десктопе всегда redirect: listAuthMethods → authURL + redirect_uri →
  // window.location.href. Тест раньше проверял popup — обновлён.
  it("всегда использует redirect-флоу: берёт authURL из listAuthMethods и уходит на Яндекс", async () => {
    const users = pb.collection("users") as unknown as {
      listAuthMethods: ReturnType<typeof vi.fn>;
      authWithOAuth2: ReturnType<typeof vi.fn>;
    };
    users.listAuthMethods.mockResolvedValue({
      oauth2: {
        providers: [
          {
            name: "yandex",
            state: "st",
            codeVerifier: "cv",
            authURL: "https://oauth.yandex.ru/authorize?x=1&redirect_uri=",
          },
        ],
      },
    });
    const hrefSpy = vi.fn();
    const original = window.location;
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { ...original, origin: "http://app.test", set href(v: string) { hrefSpy(v); } },
    });

    try {
      await loginWithYandex();

      expect(users.authWithOAuth2).not.toHaveBeenCalled();
      expect(hrefSpy).toHaveBeenCalledTimes(1);
      const target = hrefSpy.mock.calls[0]![0] as string;
      expect(target).toContain("https://oauth.yandex.ru/authorize");
      expect(target).toContain(
        encodeURIComponent("http://app.test/auth/yandex/callback"),
      );
    } finally {
      Object.defineProperty(window, "location", {
        configurable: true,
        value: original,
      });
    }
  });
});

describe("mountTelegramLoginWidget", () => {
  function makeContainer(): HTMLDivElement {
    const container = document.createElement("div");
    document.body.appendChild(container);
    return container;
  }

  it("вставляет script тег виджета с data-telegram-login", () => {
    const container = makeContainer();

    const { cleanup } = mountTelegramLoginWidget(container, "udacha_auth_bot");

    const script = container.querySelector("script");
    expect(script).toBeTruthy();
    expect(script?.getAttribute("data-telegram-login")).toBe("udacha_auth_bot");
    expect(script?.src).toContain("telegram-widget.js");
    cleanup();
  });

  it("cleanup очищает контейнер и глобальный callback", () => {
    const container = makeContainer();

    const { cleanup } = mountTelegramLoginWidget(container, "udacha_auth_bot");
    expect(container.children.length).toBeGreaterThan(0);

    cleanup();
    expect(container.children.length).toBe(0);
  });

  it("ready резолвится после load скрипта", async () => {
    const container = makeContainer();

    const { ready, cleanup } = mountTelegramLoginWidget(
      container,
      "udacha_auth_bot",
    );
    container.querySelector("script")!.dispatchEvent(new Event("load"));

    await expect(ready).resolves.toBeUndefined();
    cleanup();
  });

  it("ready реджектится при ошибке загрузки скрипта", async () => {
    const container = makeContainer();

    const { ready, cleanup } = mountTelegramLoginWidget(
      container,
      "udacha_auth_bot",
    );
    container.querySelector("script")!.dispatchEvent(new Event("error"));

    await expect(ready).rejects.toThrow(/не загрузился/);
    cleanup();
  });

  it("ready реджектится по таймауту 5с, если скрипт так и не загрузился", async () => {
    vi.useFakeTimers();
    const container = makeContainer();

    const { ready, cleanup } = mountTelegramLoginWidget(
      container,
      "udacha_auth_bot",
    );
    const assertion = expect(ready).rejects.toThrow(/5000 мс/);
    vi.advanceTimersByTime(5001);

    await assertion;
    cleanup();
  });
});
