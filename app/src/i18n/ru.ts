/**
 * Русский словарь строк интерфейса (задача 25.1).
 * MVP — только ru, без библиотек. Экран Login подключён как proof-of-concept (25.3).
 */
export const ru = {
  login: {
    title: "уДачный сад",
    subtitleSignIn: "Войдите, чтобы начать вести учёт растений",
    subtitleSignUp: "Зарегистрируйтесь — и ни одной грядки без записи!",
    emailLabel: "Email",
    emailPlaceholder: "ivan@example.com",
    passwordLabel: "Пароль",
    passwordPlaceholder: "Не короче 8 символов",
    submitting: "Секундочку…",
    signIn: "Войти",
    signUp: "Зарегистрироваться",
    switchToSignUp: "Нет аккаунта? Зарегистрироваться",
    switchToSignIn: "Уже есть аккаунт? Войти",
    or: "или",
    googleLogin: "Войти через Google",
    errorSignIn: "Не получилось войти. Проверьте email и пароль.",
    errorSignUp:
      "Не получилось зарегистрироваться. Возможно, такой email уже есть, или пароль короче 8 символов.",
    // PLAN7 (B.4) — вход через Telegram/Яндекс; используется, когда Login.tsx
    // переключат с Convex Auth на PocketBase (см. app/src/lib/auth.ts).
    yandexLogin: "Войти через Яндекс",
    telegramHint: "Или войдите через Telegram:",
    errorOAuth: "Не получилось войти. Попробуйте ещё раз.",
  },
} as const;

export type Dict = typeof ru;
