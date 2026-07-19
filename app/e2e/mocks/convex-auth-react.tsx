/**
 * Мок @convex-dev/auth/react для E2E (vite --mode e2e).
 * signIn("password", …) — успех при пароле от 8 символов,
 * состояние хранится в sessionStorage (переживает reload вкладки).
 */

import { type ReactNode } from "react";
import { setAuthed } from "./store";

export function ConvexAuthProvider({ children }: { client?: unknown; children: ReactNode }) {
  return <>{children}</>;
}

export function useAuthActions() {
  return {
    signIn: async (provider: string, params?: Record<string, unknown>) => {
      if (provider === "password") {
        const password = String(params?.password ?? "");
        const email = String(params?.email ?? "");
        if (!email.includes("@") || password.length < 8) {
          throw new Error("InvalidSecret: неверный email или пароль");
        }
      }
      setAuthed(true);
      return { signingIn: true, redirect: undefined };
    },
    signOut: async () => {
      setAuthed(false);
    },
  };
}
