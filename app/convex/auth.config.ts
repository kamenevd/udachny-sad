import { convexAuth } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";
import { Google } from "@convex-dev/auth/providers/Google";

export const { auth, signIn, signOut, isAuthenticated } = convexAuth({
  providers: [
    Password({ redirectTo: "/" }),
    Google({ redirectTo: "/" }),
  ],
});