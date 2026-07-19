import { useEffect, useRef, useState } from "react";
import { pb } from "../lib/pb";
import { loginWithYandex, mountTelegramLoginWidget } from "../lib/auth";
import { Button } from "../components/Button";
import { Input } from "../components/Input";
import { SkipLink } from '../components/SkipLink';
import { ResetPassword } from './ResetPassword';
import { t } from '../i18n';

type Flow = "signIn" | "signUp";

const TELEGRAM_BOT_USERNAME = "udacha_auth_bot";

// Демо-аккаунт (PLAN10 B.1) — обычный email-пользователь PocketBase,
// кнопка просто подставляет креды и логинится той же email-логикой.
const DEMO_EMAIL = "demo@udacha.local";
const DEMO_PASSWORD = "demo2026";

export function Login() {
  const [flow, setFlow] = useState<Flow>("signIn");
  const [showReset, setShowReset] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [oauthError, setOauthError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [tgFailed, setTgFailed] = useState(false);
  const tgContainerRef = useRef<HTMLDivElement | null>(null);

  const signIn = async (
    emailArg: string,
    passwordArg: string,
    flowArg: Flow,
  ) => {
    setError("");
    setOauthError("");
    setSubmitting(true);
    try {
      const users = pb.collection("users");
      if (flowArg === "signUp") {
        // PocketBase: сначала создаём запись, затем авторизуемся ей.
        await users.create({
          email: emailArg,
          password: passwordArg,
          passwordConfirm: passwordArg,
          emailVisibility: true,
        });
      }
      await users.authWithPassword(emailArg, passwordArg);
      // Успех — pb.authStore.onChange переключит гейт на приложение (main.tsx).
    } catch {
      setError(
        flowArg === "signIn" ? t("login.errorSignIn") : t("login.errorSignUp"),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    await signIn(email, password, flow);
  };

  const handleDemo = async () => {
    // Подставляем креды в форму (видно пользователю) и логинимся программно.
    setFlow("signIn");
    setEmail(DEMO_EMAIL);
    setPassword(DEMO_PASSWORD);
    await signIn(DEMO_EMAIL, DEMO_PASSWORD, "signIn");
  };

  const handleYandex = async () => {
    setError("");
    setOauthError("");
    setSubmitting(true);
    try {
      await loginWithYandex();
      // Успех (popup flow) — authStore.onChange переключит гейт;
      // в redirect flow страница уже ушла на Яндекс и сюда не вернётся.
    } catch {
      setOauthError(t("login.errorOAuth"));
    } finally {
      setSubmitting(false);
    }
  };

  // Telegram Login Widget — монтируем в контейнер, размонтируем при уходе
  // на экран сброса пароля (контейнер исчезает из DOM). Если скрипт не
  // загрузился за 5 с (telegram.org заблокирован) — показываем фолбэк (B.3).
  useEffect(() => {
    if (showReset) return;
    const el = tgContainerRef.current;
    if (!el) return;
    const { ready, cleanup } = mountTelegramLoginWidget(
      el,
      TELEGRAM_BOT_USERNAME,
    );
    ready.catch(() => setTgFailed(true));
    return cleanup;
  }, [showReset]);

  if (showReset) {
    return <ResetPassword onBack={() => setShowReset(false)} />;
  }

  return (
    <>
      <SkipLink />
      <main id="main-content" className="flex min-h-screen flex-col items-center justify-center px-4 py-6 bg-paper">
      <div className="w-full max-w-sm flex flex-col gap-4">
        <div className="text-center">
          <div className="mb-3 text-6xl">🌾</div>
          <h1 className="text-[30px] leading-[1.1] font-poster font-semibold uppercase tracking-[0.03em] text-ink">
            {t("login.title")}
          </h1>
          <p className="mt-3 text-[17px] leading-[1.55] text-ink-muted">
            {flow === "signIn"
              ? t("login.subtitleSignIn")
              : t("login.subtitleSignUp")}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            label={t("login.emailLabel")}
            type="email"
            placeholder={t("login.emailPlaceholder")}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
          <Input
            label={t("login.passwordLabel")}
            type="password"
            placeholder={t("login.passwordPlaceholder")}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={flow === "signIn" ? "current-password" : "new-password"}
            required
          />
          {error && <p className="text-[15px] font-mono text-red">{error}</p>}
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting
              ? t("login.submitting")
              : flow === "signIn"
                ? t("login.signIn")
                : t("login.signUp")}
          </Button>
        </form>

        <button
          type="button"
          className="text-[15px] font-mono text-blueink underline underline-offset-4"
          onClick={() => {
            setFlow(flow === "signIn" ? "signUp" : "signIn");
            setError("");
          }}
        >
          {flow === "signIn"
            ? t("login.switchToSignUp")
            : t("login.switchToSignIn")}
        </button>

        {flow === "signIn" && (
          <button
            type="button"
            className="text-[15px] font-mono text-ink-muted underline underline-offset-4"
            onClick={() => {
              setShowReset(true);
              setError("");
            }}
          >
            Забыли пароль?
          </button>
        )}

        <div className="flex items-center gap-3" aria-hidden="true">
          <div className="h-px flex-1 bg-ink-muted/40" />
          <span className="text-[13px] font-mono uppercase text-ink-muted">
            {t("login.or")}
          </span>
          <div className="h-px flex-1 bg-ink-muted/40" />
        </div>

        <Button
          type="button"
          variant="secondary"
          className="w-full"
          disabled={submitting}
          onClick={handleYandex}
        >
          {t("login.yandexLogin")}
        </Button>

        <Button
          type="button"
          variant="secondary"
          className="w-full"
          disabled={submitting}
          onClick={handleDemo}
        >
          🎭 Демо-вход
        </Button>

        {oauthError && (
          <p role="alert" className="text-[15px] font-mono text-red">
            {oauthError}
          </p>
        )}

        <div className="text-center">
          <p className="mb-2 text-[13px] font-mono text-ink-muted">
            {t("login.telegramHint")}
          </p>
          <div
            ref={tgContainerRef}
            data-testid="telegram-widget-container"
            className="flex min-h-[48px] justify-center"
          />
          {tgFailed && (
            <p role="alert" className="mt-2 text-[15px] font-mono text-red">
              Telegram-виджет не загрузился (возможно, заблокирован). Войдите
              через Яндекс или email.
            </p>
          )}
        </div>

      </div>
      </main>
    </>
  );
}
