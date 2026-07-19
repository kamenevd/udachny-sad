import { convexAuth } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";
import Google from "@auth/core/providers/google";

/**
 * Провайдеры аутентификации.
 *
 * MVP: вход по email + паролю (Password).
 * Google — за флагом: включается только когда на деплое заданы
 * AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET (задача Димы — ключи OAuth).
 */
const providers: Parameters<typeof convexAuth>[0]["providers"] = [Password];

if (process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET) {
  providers.push(Google);
}

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers,
});
